# Testing through the agent debug port

The **port** is a debug channel the user opens in the target. Through it you run a **snippet**,
JavaScript evaluated in their page, and read back what it returns. With it you test the plugin
yourself instead of handing [SKILL.md](SKILL.md) step 4 to the user.

The port reads the user's data and changes only the plugin's own state. Test objects go in a space
the user names for testing, after they agree.

## Connect

**Handoff:** the user opens **Settings → Debug → Agent debug port** in the target, switches it on,
and pastes the session id. The target must be open in a desktop browser on this machine.

On an HTTPS target the port speaks HTTPS with a certificate the browser trusts. Check once per
machine that the certificate exists, is signed by mkcert's root, covers `127.0.0.1` and has not
expired:

```bash
c=~/.dxos/debug-port/cert.pem; test -f ~/.dxos/debug-port/key.pem &&
  openssl verify -CAfile "$(mkcert -CAROOT)/rootCA.pem" "$c" &&
  openssl x509 -in "$c" -noout -text | grep -q 'IP Address:127.0.0.1'
```

If that fails, the user runs these (`mkcert -install` adds a root certificate to their system
store, and the second command replaces any old certificate), then restarts the browser:

```bash
mkcert -install
```

```bash
mkdir -p ~/.dxos/debug-port && mkcert -cert-file ~/.dxos/debug-port/cert.pem -key-file ~/.dxos/debug-port/key.pem localhost 127.0.0.1
```

Set up the port client: fetch it, write the session id to `.dxos/session`, and write the wrapper
below to `.dxos/port.sh` with `chmod +x`. The page calls the port over its own scheme, so for an HTTP
target (a Composer served on `http://localhost`) leave out the three `COMPOSER_RECOVERY_*` lines.

```bash
mkdir -p .dxos && curl -fsSL https://raw.githubusercontent.com/dxos/dxos/main/.agents/skills/composer-forensics/scripts/composer-recovery.js -o .dxos/port.mjs
```

```sh
#!/bin/sh
# Usage: .dxos/port.sh '<snippet>'
exec env COMPOSER_RECOVERY_HTTPS=1 \
  COMPOSER_RECOVERY_TLS_CERT="$HOME/.dxos/debug-port/cert.pem" \
  COMPOSER_RECOVERY_TLS_KEY="$HOME/.dxos/debug-port/key.pem" \
  node "$(dirname "$0")/port.mjs" --session "$(cat "$(dirname "$0")/session")" "$1"
```

How snippets run:

- A snippet is the body of an async function in the page: `await` works, and what it `return`s
  comes back. In scope are `dxos` (client, config) and `composer` (`plugins()`,
  `operations(key)`, `invoke(key, input)`, `snapshot()`).
- `.dxos/port.sh '<snippet>' 2>/dev/null` prints JSON; the value is its `result` field.
- Run one snippet at a time: each run listens on `127.0.0.1:9321` and waits up to 36 s for the page.
- The session lasts 30 minutes, across reloads of the tab.
- Keep a long snippet in a file under `.dxos/`, written with the file tool, and pass it as
  `.dxos/port.sh "$(cat .dxos/<file>.js)"`.

Read the target, and merge the snippet's `result` into `.dxos/target.json`:

```js
const v = dxos.client.config.values;
return {
  edgeUrl: v.runtime?.services?.edge?.url,
  hubUrl: v.runtime?.app?.env?.DX_HUB_URL,
  iceProviders: v.runtime?.services?.iceProviders,
  identity: dxos.client.halo.identity.get()?.did,
};
```

Copy only these fields out of the config: the rest of `runtime.services` holds credentials.

**Done when** `.dxos/target.json` has a non-empty `edgeUrl`, `hubUrl` and `identity`.

## Load

The port can open the Plugins settings for SKILL.md step 3's handoff:

```js
await composer.invoke('org.dxos.operation.appToolkit.openSettings', { plugin: 'org.dxos.plugin.registry' });
return 'opened';
```

The plugin snippet, with `KEY` set to the plugin's key:

```js
const key = 'KEY';
const remote = JSON.parse(localStorage.getItem('org.dxos.composer.remote-plugins') ?? '[]').find((r) => r.id === key);
return {
  plugin: composer.plugins().find((p) => p.id === key),
  devLoaded: composer.manager.getDevPluginIds().includes(key),
  installedFrom: remote?.url,
  operations: composer.operations(key).map((o) => String(o.key ?? o)),
};
```

**Done when** the plugin snippet shows `devLoaded: true`, the plugin `enabled` and `active`, and
every module the plugin defines in `moduleIds`. An `installedFrom` there is an earlier registry
install, which the dev plugin shadows once it loads.

## Test

Write the plugin's **checks** before you test: one per line of SKILL.md step 4's checklist, each a
snippet that reads what the user would see and returns pass or fail with evidence. Keep them in
`.dxos/checks.md` so every iteration reruns the same set.

Then loop:

1. Edit, and run `npx tsc --noEmit`.
2. Reload the target:

   ```js
   setTimeout(() => location.reload(), 100);
   return Date.now();
   ```

3. Wait for the new page, with `RELOAD_AT` set to the number the reload returned:

   ```js
   const wait = (ms) => new Promise((r) => setTimeout(r, ms));
   const t0 = Date.now();
   const booted = () =>
     performance.timeOrigin > RELOAD_AT && globalThis.composer?.plugins && document.querySelector('main');
   while (Date.now() - t0 < 60000 && !booted()) await wait(500);
   return { reloaded: !!booted(), bootMs: Date.now() - t0 };
   ```

   `reloaded: false` means the snippet reached the old page: run it again.

4. Run every check.

**Done when** every check passes on one reload with no edits in between. Then tell the user to
switch the port off in **Settings → Debug**.

## Building blocks for checks

A check reads what the user sees. It navigates by clicking, as the user would, and waits for text.

A behaviour check, with `Hello` the item to click and `EXPECTED` the text it should show:

```js
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text) => {
  const leaf = [...document.querySelectorAll('*')]
    .filter((e) => e.childElementCount === 0 && e.textContent.trim() === text)
    .pop();
  (leaf?.closest('a,button,[role=treeitem],li') ?? leaf)?.click();
  return !!leaf;
};
click('Hello');
for (let i = 0; i < 20 && !document.body.innerText.includes('EXPECTED'); i++) await wait(500);
let s = await composer.snapshot();
if (typeof s === 'string') s = JSON.parse(s);
return {
  pass: document.body.innerText.includes('EXPECTED') && !document.body.innerText.includes('Unable to open this object'),
  active: s.layout.active,
};
```

- Assert on rendered text. A surface that throws is caught by an error boundary: its plank shows
  "Unable to open this object", the error goes to the browser console, and `snapshot().errors`
  stays empty.
- Match visible text with `innerText`. Group headings are uppercase by CSS only: `innerText` is
  `HELLO` where `textContent` is `Hello`.
- `composer.snapshot({ since })` also carries `toasts`, the app's own report of what an operation
  did.

### Opening a space

A space's navtree is in the DOM only while that space is the open workspace, at `/w/<space id>`.
Open it by URL, with `SPACE_NAME` set to its name:

```js
const name = (s) => {
  try {
    return s.properties?.name;
  } catch {
    return undefined; // Not open yet.
  }
};
const space = dxos.client.spaces.get().find((s) => name(s) === 'SPACE_NAME');
if (space) setTimeout(() => location.assign(`/w/${space.id}`), 100);
return { found: !!space, at: Date.now() };
```

Then wait for the new page with the reload-wait snippet above, `RELOAD_AT` set to `at`.

A check that only navigates and reads may use the user's default space, "My Space".
