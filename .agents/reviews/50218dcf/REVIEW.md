---
branch: claude/project-thread-ew5w8z
commit: 50218dcf0f5e3078bdb11d77a39d6c4410a3051d
base: a2021ca16b21d0cb8885c57ed88294d542589346
mode: fast
createdAt: 2026-09-28T07:38:09.615Z
isFinalized: true
groups: 48
rules: [barrel-imports-not-internal-paths, canonical-api-surface, no-casts]
reviewId: 50218dcf
---

_1 error(s), 2 warning(s)._

# WARN 50218dcf-1 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50218dcf-2 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.82. The likeliest place is lines 13-24 (`import { type BlobBackend } from '@dxos/blob';`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50218dcf-3 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:510`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 510-521 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.
