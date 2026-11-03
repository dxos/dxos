---
branch: dm/compassionate-wozniak-dxx8fw
commit: 5c9537ab467b4372112249257245f94e8d955630
base: aedf119c01b24099ea3ea2b7f221643bf94a0f42
mode: fast
createdAt: 2026-11-03T11:49:53.642Z
isFinalized: true
groups: 216
rules: [code-not-in-strings, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, import-as-namespace-is-all-or-nothing, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-lint-suppression-to-pass, no-unused-new-api, reactive-state-via-atom-bridge, scope-multi-tenant-queries-by-space, story-for-new-ui-component, toolbars-are-menu-actions]
reviewId: 5c9537ab
---

_1 error(s), 15 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5c9537ab-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/Account.ts:21
- 5c9537ab-2 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-cloudflare-os/src/agent/Projection.ts:1
- 5c9537ab-3 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-cloudflare-os/src/api/errors.ts:1
- 5c9537ab-4 - ignored - code-not-in-strings - packages/plugins/plugin-cloudflare-os/src/api/Sandbox.ts:33
- 5c9537ab-5 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/capabilities/connector.ts:35
- 5c9537ab-6 - ignored - no-casts - packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1
- 5c9537ab-7 - ignored - no-unused-new-api - packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1
- 5c9537ab-8 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:44
- 5c9537ab-9 - ignored - story-for-new-ui-component - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:26
- 5c9537ab-10 - resolved - empty-container-uses-empty - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:62
- 5c9537ab-11 - resolved - toolbars-are-menu-actions - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:62
- 5c9537ab-12 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-cloudflare-os/src/index.ts:1
- 5c9537ab-13 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-cloudflare-os/src/operations/index.ts:1
- 5c9537ab-14 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/operations/refresh.ts:15
- 5c9537ab-15 - ignored - scope-multi-tenant-queries-by-space - packages/plugins/plugin-cloudflare-os/src/operations/sync-workspaces.ts:16
- 5c9537ab-16 - ignored - no-lint-suppression-to-pass - packages/plugins/plugin-cloudflare-os/src/types/CloudflareOsOperation.ts:13

## Issues

# WARN 5c9537ab-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/Account.ts:21`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 21-31 (`export const fromConnection = (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5c9537ab-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-cloudflare-os/src/agent/Projection.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.91. The likeliest place is lines 1-13 (`import { type ContentBlock } from '@dxos/types';`, location confidence 0.73). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Projection.ts follows the house PascalCase namespace-module pattern; its importers use `import * as Projection`.

# WARN 5c9537ab-3 namespace-brand-key-prefixing `packages/plugins/plugin-cloudflare-os/src/api/errors.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 1-9 (`import { BaseError } from '@dxos/errors';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Plugin error classes use a bare error name, as other plugins do.

# WARN 5c9537ab-4 code-not-in-strings `packages/plugins/plugin-cloudflare-os/src/api/Sandbox.ts:33`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.94. The likeliest place is lines 33-40 (`const CAPNWEB_MODULE = `data:text/javascript;charset=utf-8;base64,${btoa(`//#...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The gadget prelude must be inlined in the srcdoc as a data: URL; a sandboxed null-origin frame cannot load a file. Mirrors the upstream Workshop.

# WARN 5c9537ab-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/capabilities/connector.ts:35`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 35-46 (`const onSubmit: ConnectorSpec.CredentialForm<SignInValues>['onSubmit'] = ({ v...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5c9537ab-6 no-casts `packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `ComponentType<any>` is the type annotation of the house lazy-container pattern, not a cast.

# WARN 5c9537ab-7 no-unused-new-api `packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.80. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The container export is used by `capabilities/react-surface.ts`.

# WARN 5c9537ab-8 reactive-state-via-atom-bridge `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:44`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The hook holds remote RPC state from the deployment, not ECHO state.

# WARN 5c9537ab-9 story-for-new-ui-component `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:26`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 26-37 (`export const WorkspaceArticle = ({ role, subject }: WorkspaceArticleProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The article needs a live deployment; its frame, GadgetFrame, has a story.

# WARN 5c9537ab-10 empty-container-uses-empty `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:62`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.93. The likeliest place is lines 62-73 (`<Button.Root variant='ghost' onClick={handleRefresh} data-testid='cloudflare-...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5c9537ab-11 toolbars-are-menu-actions `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:62`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 62-73 (`<Button.Root variant='ghost' onClick={handleRefresh} data-testid='cloudflare-...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5c9537ab-12 namespace-export-with-internal-hiding `packages/plugins/plugin-cloudflare-os/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 1-8 (`export * as CloudflareOsPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The barrel matches other plugins (plugin-chess).

# WARN 5c9537ab-13 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-cloudflare-os/src/operations/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-6 (`export * as CloudflareOsOperationHandlerSet from './CloudflareOsOperationHand...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Same as 5c9537ab-2.

# WARN 5c9537ab-14 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/operations/refresh.ts:15`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 15-28 (`export const refreshWorkspace = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5c9537ab-15 scope-multi-tenant-queries-by-space `packages/plugins/plugin-cloudflare-os/src/operations/sync-workspaces.ts:16`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.80. The likeliest place is lines 16-27 (`const handler: Operation.WithHandler<typeof CloudflareOsOperation.SyncWorkspa...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The query runs inside `Database.layer` of the connection's own space, so it is scoped to it.

# WARN 5c9537ab-16 no-lint-suppression-to-pass `packages/plugins/plugin-cloudflare-os/src/types/CloudflareOsOperation.ts:13`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.80. The likeliest place is lines 13-22 (`import { Connection } from '@dxos/link';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Same TS2883 suppression pattern as plugin-github; the import is needed for declaration emit.

## Appendix

### System One pass

- model: jev-latest
- base for context: `aedf119c01b24099ea3ea2b7f221643bf94a0f42`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 16 violations written to fragments, 239 uncertain, 1430 clean, 0 unanswered
- left for an agentic reviewer: 85 batch(es)

```text
requests: 700 (153 verdicts re-asked with context the model requested)
estimated input tokens: 3127575
billed input tokens: 2874819 (cost $0.1207)
measured chars per token: 3.26
```
