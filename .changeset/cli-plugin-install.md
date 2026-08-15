---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Add `dx plugin add` and `dx plugin remove`, so the CLI can run plugins it was not compiled with. `add <url>` fetches a manifest and snapshots the bundle under `plugins/<id>/`; `add --dev <path>` reads a directory in place, falling back to its `dx.config.ts` when there is no built manifest, and may override a builtin of the same id. Both enable by default (`--no-enable` stops at install) and print the resolved plugin id. `remove` deletes a snapshot or forgets a linked directory. Installed plugins register from metadata cached at install time, so a plugin's code is imported only once something enables it, and a plugin that fails to import is reported by `dx plugin list` instead of failing every command. `PluginManifestSchema`'s shared-package list is now exported as `@dxos/app-framework/SharedPackages`.
