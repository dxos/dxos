# @dxos/codemorph

Codemods for large refactors. The current set migrates consumers of `@dxos/react-ui`, `@dxos/react-ui-list`,
`@dxos/react-ui-form` and `@dxos/react-ui-menu` to their Next entries (Phase B of the plan in
`packages/ui/react-ui/src/next/AUDIT.md` §7).

## Running

```bash
node tools/codemorph/src/main.ts --transform all --dry-run \
  --report temp/codemods.json --summary temp/codemods.md \
  --exclude packages/ui/react-ui/src packages
```

- `--transform <name|all>`: one transform, a comma-separated list, or `all` (in the order below).
- `--dry-run`: report only; without it the files are rewritten in place.
- `--report <file.json>`: every conversion count and every residue item (file, line, reason, snippet).
- `--summary <file.md>`: the markdown tables also printed to stdout.
- `--exclude <prefix>`: skip paths with this prefix (repeatable); `node_modules`, `dist` and symlinks are always skipped.

Run on a clean tree, then `pnpm format` and `moon run :lint -- --fix`: the transforms edit source text in place and
leave formatting (unwrapped children keep their old indentation, new imports are not sorted) to those tools.

## Transforms

Every transform is idempotent, and each one reports what it could not convert; that list is Phase C's manual
residue. Elements are matched by what their tag resolves to through the file's imports, so `Panel.Toolbar` and
`Next.Panel.Toolbar` are the same part, and a local `Panel` is never touched.

| Name         | What it does                                                                                                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renames`    | Part and prop renames (`Panel.Toolbar` → `Header`, `IconButton` → `Button`, Radix → Ark names, the Phase A4 ports), unwrapping of bundled parts (`Portal`, `Overlay`, `Arrow`, `Viewport`, `Tooltip.Provider`), `density=` → `size=`, Icon sizes |
| `classnames` | The fixed rules of the `classNames` policy only: Icon valence/tone/spin and `shrink-0`, Card text `truncate`/tone/`lines`, `font-mono` → `Input variant='mono'`, `col-span-N` → `span`, `dx-document` → `width='document'`                        |
| `emphasis`   | Text-emphasis class rename; a no-op until `TEXT_EMPHASIS_RENAMES` is filled                                                                                                                                                                        |
| `imports`    | Current imports → Next entries: `@dxos/react-ui` names become `Next.*` members, list and menu names move to their `/next` entry                                                                                                                  |

`all` runs `renames` first because it reads current part names (`IconButton` must still be an `IconButton` to gain
`iconOnly` handling), and `imports` last; the imports transform leaves names the renames transform owns in place and
reports them.

### Where things go

`src/react-ui-next/targets.ts` is the single import table: `MODULES` (current and Next entry per package, and whether
names are namespace members) and `IMPORT_TARGETS` (per-name target, rename, or "no counterpart" with the reason). When
the cut-over makes Next the default export, only that file changes.

`src/react-ui-next/next-exports.ts` snapshots the Next entries' exports and composite parts; the imports transform
checks every `Root.Part` it rewrites against it. `next-exports.test.ts` fails when the sources drift; regenerate the
snapshot from `readReactUiNext` / `readSiblingNext` in `extract.ts`.

### Text emphasis (deferred)

The new emphasis class names are not decided (DESIGN.md "Text emphasis"). Fill `TEXT_EMPHASIS_RENAMES` in
`src/react-ui-next/transforms/emphasis.ts` with `current → new` class names (e.g. `'text-description': '…'`) and the
transform rewrites them in every string literal, keeping variant prefixes (`hover:`, `md:`, `!`) and opacity
suffixes (`/50`). It does not touch CSS files.

## Why not ts-morph

The catalog pins `ts-morph` 16, which bundles TypeScript 4.8 and cannot parse `satisfies` (used in hundreds of files here).
The transforms parse with `@typescript/typescript6` and edit source ranges directly, which also keeps every
untouched line byte-for-byte. Resolution is syntactic (through each file's own imports), which is all a rename needs.

## Other scripts

`src/migrate-to-nested-source.ts` converts packages to the nested `exports.source` format
(`npx tsx tools/codemorph/src/migrate-to-nested-source.ts --dry-run`).
