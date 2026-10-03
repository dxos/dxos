# Resolution — 50218dcf

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 50218dcf-1 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 50218dcf-2 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 50218dcf-3 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:510

<!-- Notes (the parser only tolerates rows, `#` headings and `<!--` lines, so one comment per line). -->
<!-- 50218dcf-1 — points at `import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient'` on -->
<!-- line 1. Pre-existing; this PR's only added import in the file is line 13. -->
<!-- 50218dcf-2 — the flagged line IS this PR's: `import { type BlobBackend } from '@dxos/blob'`. False -->
<!-- positive. `@dxos/blob` is the package's root barrel (`"."` in its `exports`), and `BlobBackend` -->
<!-- reaches it via `export * from './backend.ts'` in `src/index.ts`. The subpath form the rule forbids -->
<!-- would be `@dxos/blob/backend`, which is not what is imported. The neighbouring `@dxos/blob/s3` -->
<!-- import is a declared subpath export too, not an internal path. -->
<!-- 50218dcf-3 — `const result: Record<string, unknown> = { ...(value as any) }` on line 510, in -->
<!-- `decodeRefsFromSchema`. Pre-existing and untouched here; this PR's changes to the file are the -->
<!-- `blobBackends` option, the `#unregisterBlobBackends` field, its registration loop and `_close`. -->
<!-- Worth fixing, but not in a PR about blob backends. -->
