# @dxos/eslint-plugin-rules

## Installation

```bash
pnpm i @dxos/eslint-plugin-rules
```

## Rules

Severities below are the ones the repo actually runs, from the root `.oxlintrc.json` — not the
package's own `configs.recommended`, which nothing in this repo uses. `denyWarnings: true` is set,
so `warn` and `error` both fail CI; the distinction is documentary.

| Rule | Enforces | Severity | Fix |
| --- | --- | --- | --- |
| `dxos-subpath-exports` | A package's root barrel agrees with the per-namespace subpaths in its `exports` map | warn | partial |
| `dxos-subpath-imports` | Namespace subpath imports for designated `@dxos` packages | warn | yes |
| `dxos-package-imports` | A package's own `imports` aliases over relative paths to the same file | warn | yes |
| `effect-subpath-imports` | Subpath imports for Effect packages | warn | yes |
| `import-as-namespace` | `import * as X` for modules marked `@import-as-namespace`, with `X` matching the filename | warn | yes |
| `no-bare-dot-imports` | No bare `.` or `..` specifiers | error | yes |
| `no-effect-run-promise` | `EffectEx.runPromise` from `@dxos/effect` over `Effect.runPromise` | error | no |
| `no-empty-promise-catch` | `.catch()` is passed a handler | error | yes |
| `consistent-update-param` | The callback param of `Obj.update()` / `Relation.update()` / `Entity.update()` matches the object argument's name | warn | yes |
| `translation-key-format` | `dot.kebab-case` translation keys with the required suffix, defined in the namespace's translations | warn | yes |
| `header` | Copyright header | warn | yes |
| `comment` | Comment format | **not enabled** | no |

`comment` is implemented and exported but registered nowhere — it is commented out in
`configs.recommended` (too many findings, no autofix) and absent from `.oxlintrc.json`.

### Scoping worth knowing

Three rules are narrower than their names suggest, and a finding's absence does not mean a file was
checked and passed:

- **`dxos-subpath-exports` only engages for a package that already declares at least one PascalCase
  subpath.** A package with none has not migrated, and reporting its namespaces would flag the
  migration itself rather than a defect. It lints only the root barrel, following bare `export *`
  into nested barrels — so `export * from './types'` with the namespaces a directory down satisfies
  the same contract as declaring them all at the root.
- **`dxos-subpath-imports` applies to a fixed list**, currently `@dxos/app-framework`,
  `@dxos/app-graph`, `@dxos/app-toolkit`, `@dxos/assistant-toolkit`, `@dxos/compute`. Adding a
  package to that list requires the package to export `./package.json`, or the rule silently finds
  nothing.
- **`dxos-package-imports` steps aside for conditional aliases.** Where an alias resolves per
  condition (`#plugin` → `plugin.node.ts` under node, `plugin.tsx` by default), it and a relative
  path to one branch are *different modules*, so substituting one for the other would change which
  module loads. Naming a branch deliberately is not a bypass and is not reported.

### `dxos-subpath-exports` findings

Eight checks, of which only `missingNamespaceExport` autofixes — the rest describe a decision the
rule cannot make for you:

| Message | Meaning |
| --- | --- |
| `missingNamespaceExport` | A declared subpath has no matching namespace on the barrel. Inserted among its sorted siblings. |
| `namespaceTargetMismatch` | Barrel and subpath resolve to different modules, so a consumer rewritten to the subpath gets another module. |
| `typeOnlyNamespaceExport` | Re-exported as a type where the subpath declares a value entrypoint. |
| `undeclaredNamespace` | On the barrel but with no subpath, so importing it costs the whole package. |
| `ambiguousNamespace` | Reached through two star paths landing on different modules. ES resolves this as ambiguous and drops the name from the barrel entirely — a link error in the consumer, silent at the barrel. |
| `externalStarExport` | Bare `export *` of another package. Its names cannot be given subpaths, and its releases silently change this package's API. |
| `pluginInstanceExported` | The barrel re-exports a plugin entrypoint; the root entry carries types and operations only. |
| `nestedPathExport` | The barrel reaches a directory down. Declare it in that directory's own barrel and re-export the directory. |

Why it exists: `dxos-subpath-imports` rewrites a consumer's `import { Drawing } from '@dxos/plugin-illustrator'`
into `import * as Drawing from '@dxos/plugin-illustrator/Drawing'` purely from the exports map, so
that rewrite is sound only while barrel and map agree. Nothing else checks the two together — that
rule lints consumers and never opens the barrel, `import-as-namespace` lints one statement at a time
and never opens `package.json`, and `pkg-lint` never parses TypeScript.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2022 © DXOS
