---
name: composer-plugin-dev
description: Composer plugin in its own repository, outside the dxos monorepo: build it, test it in the user's live Composer through the agent debug port, and publish it to their private registry. Use when creating or changing such a plugin, trying one in a deployed Composer, or publishing one privately.
---

# Composer plugin development

You build a plugin in the user's repository and test it in the **target**: the Composer the user
has open in their browser, at the URL they name. The target fixes the `@dxos/*` build you compile
against and the EDGE you publish to; read both from it.

You reach the target through its **port**, a debug channel the user opens in their tab. Through it
you run a **snippet**, JavaScript evaluated in their page, and read back what it returns.

Four steps end in a **handoff**: a click that runs new code or acts as the user's account, so it is
theirs to make. At a handoff, open the page they need through the port, say exactly what to click,
and wait for them.

The port reads the user's data and changes only the plugin's own state. Test objects go in a space
the user names for testing, after they agree.

Before step 1, put Node `>=22.12` on `PATH` for every command. In a new repository, `git init` and
write a `.gitignore` naming `.dxos/`, `node_modules/` and `dist/`.

When a command or snippet fails, look it up in [REFERENCE.md](REFERENCE.md) § Failures.

## 1. Connect

**Handoff:** the user opens **Settings → Debug → Agent debug port** in the target, switches it on,
and pastes the session id. The target must be open in a desktop browser on this machine.

The port speaks HTTPS with a certificate the browser trusts. Check once per machine:

```bash
ls ~/.dxos/debug-port/cert.pem ~/.dxos/debug-port/key.pem
```

If either file is missing, the user runs these (`mkcert -install` adds a root certificate to their
system store), then restarts the browser:

```bash
mkcert -install
```

```bash
mkdir -p ~/.dxos/debug-port && mkcert -cert-file ~/.dxos/debug-port/cert.pem -key-file ~/.dxos/debug-port/key.pem localhost 127.0.0.1
```

Set up the port client: fetch it, write the session id to `.dxos/session`, and write the wrapper
below to `.dxos/port.sh` with `chmod +x`.

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

Read the target, and save the snippet's `result` as `.dxos/target.json`:

```js
const v = dxos.client.config.values;
return {
  origin: location.origin,
  commit: v.runtime?.app?.build?.commitHash,
  version: v.runtime?.app?.build?.version,
  edgeUrl: v.runtime?.services?.edge?.url,
  hubUrl: v.runtime?.app?.env?.DX_HUB_URL,
  iceProviders: v.runtime?.services?.iceProviders,
  identity: dxos.client.halo.identity.get()?.did,
};
```

Copy only these fields out of the config: the rest of `runtime.services` holds credentials.

**Done when** `.dxos/target.json` has a non-empty `origin`, `commit`, `edgeUrl`, `hubUrl` and
`identity`.

## 2. Pin the toolchain

The target's import map supplies `@dxos/*`, `react` and `effect` to the plugin at runtime, so
compile against those exact builds. `<commit7>` is the first 7 characters of `commit`; a longer SHA
installs a second copy of the SDK.

Fetch the plugin guide for that build, and follow it for every file you write:

```bash
curl -fsSL https://raw.githubusercontent.com/dxos/dxos/<commit7>/docs/src/content/docs/docs/composer/publishing-plugins.md -o .dxos/guide.md
```

A new plugin starts from the guide's "Example: a plugin with its own navtree group"; read the
"Things to know" list after it before writing code. In an existing plugin, change only the
dependency pins.

Pin `package.json`:

- `@dxos/*`: `https://pkg.pr.new/dxos/dxos/@dxos/<name>@<commit7>`, in this form even where the
  guide shows another. The example needs `app-framework`, `app-graph` and `app-toolkit`; add a
  package when you import from it.
- `effect`, `react`, `react-dom`: the exact version the pinned `@dxos/app-framework` declares
  (`~19.3.1` → `19.3.1`):

  ```bash
  curl -fsSL https://pkg.pr.new/dxos/dxos/@dxos/app-framework@<commit7> | tar -xzO package/package.json \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s);const a={...p.peerDependencies,...p.dependencies};for(const k of ["effect","react","react-dom"])console.log(k,a[k])})'
  ```

- `@types/react`: the newest release with `react`'s major and minor (`npm view @types/react
versions`). Its releases lag `react`'s, so `react`'s own version may not exist.
- Other devDependencies: the guide's, as written.

Install with `npm install --legacy-peer-deps`. Without the flag, npm takes peers of the pkg.pr.new
packages from the npm registry, and their `react` ranges conflict.

**Done when** the install succeeds, this lists exactly one path per package, and `npx tsc --noEmit`
exits 0:

```bash
find node_modules -path '*node_modules/effect/package.json' -o -path '*node_modules/react/package.json' -o -path '*node_modules/react-dom/package.json'
```

## 3. Build

```bash
npx vite build
cat <outDir>/manifest.json
```

`<outDir>` is `build.outDir` in `vite.config.ts`.

**Done when** `manifest.json` names the plugin's key and version.

## 4. Load the dev server

Start Vite's dev server in the background. `composerPlugin` serves
`http://localhost:3967/manifest.json` from it:

```bash
npx vite
```

Open the Plugins settings in the target:

```js
await composer.invoke('org.dxos.operation.appToolkit.openSettings', { plugin: 'org.dxos.plugin.registry' });
return 'opened';
```

**Handoff:** under **Dev Server**, the user leaves the Manifest URL at its default and clicks
**Enable**. Composer loads the plugin from the dev server now and on every reload until they click
**Disable**.

The plugin snippet, with `KEY` set to the plugin's key:

```js
const key = 'KEY';
const remote = JSON.parse(localStorage.getItem('org.dxos.composer.remote-plugins') ?? '[]').find((r) => r.id === key);
return {
  plugin: composer.plugins().find((p) => p.id === key),
  installedFrom: remote?.url,
  operations: composer.operations(key).map((o) => String(o.key ?? o)),
};
```

**Done when** the plugin snippet shows the plugin `enabled` and `active`, every module the plugin
defines in `moduleIds`, and no `installedFrom`.

## 5. Test

Write the plugin's **checks** before you test: one per behaviour the user asked for, each a snippet
that reads what the user would see and returns pass or fail with evidence. Write each so a naive
implementation fails it: "a button that changes the number" means clicking it many times and
asserting every click changed it. Keep them in `.dxos/checks.md` so every iteration reruns the
same set. REFERENCE.md § Checks has the building blocks.

Then loop:

1. Edit, and run `npx tsc --noEmit`.
2. Reload the target. The dev server serves the new source, so there is nothing to rebuild:

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

**Done when** every check passes on one reload with no edits in between.

Steps 6 to 8 publish the plugin. Take them only when the user asks to publish or install it from
the registry; otherwise the work ends here, with the plugin running from the dev server.

## 6. Log in with dx

Install the `dx` CLI built from the same commit:

```bash
npm install --prefix .dxos/cli https://pkg.pr.new/dxos/dxos/@dxos/cli@<commit7>
node .dxos/cli/node_modules/@dxos/cli/bin/dx.js --version
```

Write `.dxos/dx.yml` from `target.json`. `dx` layers it over its own defaults, so it names only the
endpoints:

```yaml
version: 1
runtime:
  services:
    edge:
      url: <edgeUrl>
    hub:
      url: <hubUrl>
    iceProviders:
      - urls: <iceProviders[0].urls>
```

Pin every `dx` call to the target with a wrapper at `.dxos/dx` (`chmod +x`). `<slug>` comes from
the target's host (`dev-composer-space`); its own profile keeps this identity apart from the user's
`dx`:

```sh
#!/bin/sh
# dx pinned to the target: its commit's build, its EDGE, its own profile.
d="$(cd "$(dirname "$0")" && pwd)"
exec node "$d/cli/node_modules/@dxos/cli/bin/dx.js" --profile <slug> --config "$d/dx.yml" "$@"
```

Call `dx` only through `.dxos/dx`. Tell the user they can do the same in their shell with
`alias dx="$PWD/.dxos/dx"`, run from the project root.

Run the login in the background. `--no-open` keeps `dx` from opening the system default browser,
which may not be the one holding the target:

```bash
.dxos/dx account login --method composer <origin> --no-open
```

`dx` prints a link and the code Composer should show. Open the link in the target, with `LINK` set
to it; the port session survives the navigation:

```js
setTimeout(() => location.assign('LINK'), 100);
return 'opened';
```

**Handoff:** the user checks that the dialog shows the code `dx` printed and clicks **Authorize**.

**Done when** `.dxos/dx halo identity` prints an `identityDid` equal to `identity` in
`target.json`. The target lists private plugins only to its own identity, which `--method composer`
joins.

## 7. Publish

Each version publishes once, and the first private release of a key claims it. Bump `version` in
`package.json` (a prerelease such as `0.1.0-dev.3` is fine), then:

```bash
.dxos/dx registry publish --private
```

**Done when** it prints `Uploaded:` with a URL under `<edgeUrl>registry/private/modules/`.

## 8. Install from the registry

Open the Plugins settings again. **Handoff:** the user clicks **Disable** under Dev Server.

Stop the dev server: kill the process `lsof -nP -iTCP:3967 -sTCP:LISTEN` names. Then open the
registry:

```js
await composer.invoke('org.dxos.operation.appToolkit.openPluginRegistry', {});
return 'opened';
```

**Handoff:** the user installs the plugin from the registry's **Registry** category, where it is
listed only to them.

**Done when** the plugin snippet shows `installedFrom` under `<edgeUrl>registry/private/modules/`,
and every check in `.dxos/checks.md` passes. Then tell the user to switch the port off in
**Settings → Debug**.
