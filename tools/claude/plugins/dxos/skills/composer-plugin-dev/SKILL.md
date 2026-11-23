---
name: composer-plugin-dev
description: Composer plugin in its own repository, outside the dxos monorepo: build it, load it into the user's Composer from a local dev server, and optionally test it through the agent debug port or publish it to their private registry. Use when creating or changing such a plugin, trying one in a deployed Composer, or publishing one privately.
---

# Composer plugin development

You build a plugin in the user's repository and load it into the **target**: the Composer the user
has open in their browser. The user enables your dev server in the target and
tries the plugin there.

Two steps end in a **handoff**: something only the user can do in the target. Say exactly what to
click and what they should see, and wait for them.

Two add-ons extend the flow; take each only when its condition holds:

- [DEBUG-PORT.md](DEBUG-PORT.md): the user wants you to test the plugin yourself in the target.
- [PUBLISHING.md](PUBLISHING.md): the user asks to publish the plugin or install it from the
  registry.

In a new repository, `git init` and write a `.gitignore` naming `.dxos/`, `node_modules/` and
`dist/`.

When a command fails, look it up in [REFERENCE.md](REFERENCE.md).

## 1. Pin the toolchain

The target supplies `@dxos/*`, `react` and `effect` to the plugin at runtime, so compile against the
SDK snapshot closest to it: npm's `@next`, published from `main` every Monday. This prints its
version, `<version>`, and saves it as `.dxos/target.json`:

```bash
mkdir -p .dxos && v=$(npm view @dxos/app-framework@next version) && echo "{ \"version\": \"$v\" }" > .dxos/target.json && echo "$v"
```

`<version>` ends in the commit it was built from, `X.Y.Z-next-<commit>`. Fetch the plugin guide for
that commit, and follow it for every file you write:

```bash
curl -fsSL https://raw.githubusercontent.com/dxos/dxos/<commit>/docs/src/content/docs/docs/plex/publishing-plugins.md -o .dxos/guide.md
```

A new plugin starts from the guide's first example, "Example: a plugin with its own group in the
navigation tree" ("…its own navtree group" in older guides). Read the "Things to know" list after it
before writing code. In an existing plugin, change only the dependency pins.

Pin `package.json`:

- `@dxos/*`: each package's snapshot of `<commit>`, exactly, with no `^` or `~`, even where the
  guide shows another form. SDK packages share `<version>`; `@dxos/plugin-*` and `@dxos/cli` are
  versioned apart, so look each up. The example needs `app-framework`, `app-graph` and
  `app-toolkit`; add a package when you import from it.

  ```bash
  npm view @dxos/<name> versions --json | grep -o '[^"]*-next-<commit>'
  ```
- `effect`, `react`, `react-dom`: the exact version the pinned `@dxos/app-framework` declares
  (`~19.3.1` → `19.3.1`):

  ```bash
  npm view @dxos/app-framework@<version> peerDependencies.effect peerDependencies.react peerDependencies.react-dom
  ```

- `@types/react`: the newest release with `react`'s major and minor (`npm view @types/react
versions`). Its releases lag `react`'s, so `react`'s own version may not exist.
- Other devDependencies: the guide's, as written.

Install with `npm install`.

**Done when** the install succeeds, this lists exactly one path per package, and `npx tsc --noEmit`
exits 0:

```bash
find node_modules -path '*node_modules/effect/package.json' -o -path '*node_modules/react/package.json' -o -path '*node_modules/react-dom/package.json'
```

## 2. Build

```bash
npx vite build
cat <outDir>/manifest.json
```

`<outDir>` is `build.outDir` in `vite.config.ts`.

**Done when** `manifest.json` names the plugin's key and version.

## 3. Load the dev server

Start Vite's dev server in the background. `composerPlugin` serves
`http://localhost:3967/manifest.json` from it:

```bash
npx vite
```

**Handoff:** in the target, the user opens the gear in the left rail, then **Plugins**. Under **Dev
Server** they leave the Manifest URL at its default and click **Enable**. If Chrome asks to let the
page look for and connect to devices on the local network, they click **Allow**: the dev server is on
`localhost`. Composer loads the plugin from the dev server now and on every reload until they click
**Disable**.

**Done when** the user sees the plugin in the target, where the guide's example says it appears.

## 4. Try it

Give the user a checklist: one line per behaviour they asked for, saying what to click and what they
should see. Write each so a naive implementation fails it: "a button that changes the number" means
clicking it several times and seeing the number change each time.

**Handoff:** the user works through the checklist and reports back.

On a report of a failure:

1. Edit, and run `npx tsc --noEmit`.
2. Ask the user to reload the target. The dev server serves the new source, so there is nothing to
   rebuild.

**Done when** the user confirms every line of the checklist on one reload with no edits in between.
The work ends here, with the plugin running from the dev server, unless the user asks to publish.
