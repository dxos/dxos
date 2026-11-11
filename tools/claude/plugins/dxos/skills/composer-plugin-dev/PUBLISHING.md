# Publishing to the private registry

Take these steps only when the user asks to publish the plugin or install it from the registry, after
[SKILL.md](SKILL.md) step 4 is done. They need the target's endpoints and identity in
`.dxos/target.json`: connect the port first, per [DEBUG-PORT.md](DEBUG-PORT.md) § Connect.

## 1. Log in with dx

Install the `dx` CLI built from the pinned commit:

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
# dx pinned to the target: the pinned build, the target's EDGE, its own profile.
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

## 2. Publish

Skip this step when the user asks only to install a version already in the registry.

Each version publishes once, and the first private release of a key claims it. Bump `version` in
`package.json` (a prerelease such as `0.1.0-dev.3` is fine), then:

```bash
.dxos/dx registry publish --private
```

**Done when** it prints `Uploaded:` with a URL under `<edgeUrl>registry/private/modules/`.

## 3. Install from the registry

**Handoff:** the user clicks **Disable** under Dev Server in the Plugins settings.

Stop the dev server: kill the process `lsof -nP -iTCP:3967 -sTCP:LISTEN` names. Then open the
registry:

```js
await composer.invoke('org.dxos.operation.appToolkit.openPluginRegistry', {});
return 'opened';
```

**Handoff:** the user installs the plugin from the registry's **Registry** category, where it is
listed only to them.

**Done when** DEBUG-PORT.md's plugin snippet shows `installedFrom` under
`<edgeUrl>registry/private/modules/`, and every line of [SKILL.md](SKILL.md) step 4's checklist passes
again: through the checks in `.dxos/checks.md` if you wrote them, otherwise as the user confirms. Then tell the user
to switch the port off in **Settings → Debug**.
