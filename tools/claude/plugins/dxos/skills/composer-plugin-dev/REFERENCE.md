# Composer plugin development: reference

On-demand material for [SKILL.md](SKILL.md): building blocks for checks, and failures by symptom.

## Checks

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

A space's navtree is in the DOM while that space is the open workspace. Close any open dialog, then
click the space's name in the rail:

```js
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const tab = [...document.querySelectorAll('[role=tab],button')].find(
  (e) => (e.getAttribute('aria-label') || e.textContent.trim()) === 'SPACE_NAME',
);
tab?.click();
await wait(2000);
return { found: !!tab, url: location.href };
```

A check that only navigates and reads may use the user's default space, "My Space".

## Failures

| Symptom                                                                                                                | Cause and fix                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A snippet run ends "Browser did not connect … within 36000ms"                                                          | The session lapsed (30 minutes), the tab closed, or the browser cannot reach `127.0.0.1`. Ask the user to switch the port off and on and paste the new id. |
| The page's requests to `127.0.0.1` fail with `net::ERR_BLOCKED_BY_CLIENT`                                              | The browser blocks loopback from pages, as embedded app browsers do. The target has to be in a desktop browser.                                            |
| Chrome asks whether the page may reach devices on the local network                                                    | The user allows it: the port, the dev server and `dx`'s login callback are on loopback.                                                                    |
| `npm install` fails with `ERESOLVE` on a `react` peer                                                                  | Install with `--legacy-peer-deps`.                                                                                                                         |
| `npm install` fails with `ETARGET` for `@types/react`                                                                  | That version does not exist yet; take the newest with `react`'s major and minor.                                                                           |
| `vite build` fails with "Cannot find native binding"                                                                   | Node is older than `^20.19` or `>=22.12`. Switch Node, delete `node_modules` and `package-lock.json`, and install again.                                   |
| The plugin is loaded but a module is missing from `moduleIds`, or a node or surface never shows                        | An id is not camelCase (key's last segment, module, extension, node or surface id). A hyphenated id is dropped without an error.                           |
| `account login` rejects `--no-open`, or fails with "Composer returned no admission; it may predate this version of dx" | The target predates the loopback login, so `dx` cannot log in to it. Stop and tell the user.                                                               |
| `account login` times out although the user clicked **Authorize**                                                      | The page could not reach `dx`'s callback on `127.0.0.1`. See the local-network row above.                                                                  |
| `account login` refuses because the profile already has an identity                                                    | Run `.dxos/dx account logout` first, or change `<slug>` in `.dxos/dx`.                                                                                     |
| The user offers `DX_API_TOKEN` instead of a login                                                                      | It works only for an identity with an account: EDGE refuses to mint one otherwise ("Identity is not associated with an account").                          |
| A published plugin is missing from the target's **Registry** category                                                  | It was published by another identity. Check `dx`'s `identityDid` against `identity` in `target.json`.                                                      |
| `registry publish` rejects the version                                                                                 | That version is already published. Bump it.                                                                                                                |
