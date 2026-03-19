# Separator Consolidation Plan

_2026-03-19 — companion document to `separator-audit.md`_

## Goals

1. Reduce collision risk from ad-hoc separator usage.
2. Make separator choice intentional rather than arbitrary.
3. Provide shared utilities so packages don't reinvent key composition.
4. Keep the migration incremental — no big-bang rewrite.

## Design Principles

- **Semantic separator choice**: different structural meanings should use different characters so they're unambiguous.
- **Collision-safe by default**: composite keys that could contain user data should use control characters or an escape/validation mechanism.
- **Helpers over inline strings**: a `queueKey(subspace, spaceId, queueId)` call is self-documenting and lets us change the separator later; `${subspace}:${spaceId}:${queueId}` does not.
- **Encapsulate separators and prefixes**: separator characters and prefix markers should be internal implementation details of helper functions, never exported as constants for consumers to use directly. The gold standard is `qualifyId(parent, segment)` — not `Separators.path`. Similarly, `companionId(parentPath, 'settings')` — not `${parentPath}/${COMPANION_PREFIX}settings`.
- **Domain-specific helpers on a shared primitive**: a low-level `compositeKey()` in `@dxos/util` provides the foundation, but each domain builds its own named helpers on top (e.g., `queueKey()`, `storageKey()`, `activationEventKey()`).

## Proposed Separator Taxonomy

| Semantic Role | Character | Rationale | Status |
|---------------|-----------|-----------|--------|
| **Graph path** (hierarchical parent/child) | `/` | Already established via `qualifyId()`. Natural tree separator. | Keep helpers, stop exporting `Separators.path` |
| **Companion prefix** (type marker within a path segment) | `~` | RFC 1738 safe. | **Stop exporting `COMPANION_PREFIX`; provide `companionId()` helper** |
| **Pinned workspace prefix** | `!` | Denotes non-space workspaces in graph. | **Stop hardcoding `!dxos:`; provide `pinnedWorkspaceId()` helper** |
| **Registry category separator** | `>` | Separates plugin key from category view. | **Provide `registryCategoryId()` helper** |
| **Graph key composition** (internal key encoding) | `\u0001`, `\u0002` | Control chars = zero collision risk. | **Stop exporting `Separators`; keep as internal to helpers** |
| **Composite key** (joining IDs to make a lookup key) | `:` | Most common ad-hoc choice. Works well when parts are validated IDs that can't contain `:`. | **Standardize with shared primitive + domain helpers** |
| **Property path** (traversing nested object fields) | `.` | Universal convention. Already used consistently for this purpose. | **Standardize with helper** |
| **Display / human-readable** (logging, debug strings) | `-`, `#`, `.` | Context-dependent. Less important to standardize since they're for humans, not machines. | Low priority |
| **Storage namespace** (scoping keys in localStorage/KV) | `:` | Same as composite key — validate that namespace can't contain `:`. | Use domain-specific helper built on `compositeKey` |
| **Encoded list** (serializing arrays to a string) | `\|` | Already established by `headsCodec`. Pipe is rare in IDs. | Keep as-is, document pattern |
| **Tree path** (react-ui-list) | `+` | Local to one package. `+` is unusual but collision-safe for that context. | Keep as-is |
| **Plank size key** (plugin-deck) | `+` | Separates plank ID from variant for size persistence. | Keep as-is, local to plugin-deck |

## Proposed Changes

### Phase 1: Shared `compositeKey` primitive in `@dxos/util`

A low-level building block that other packages use to build domain-specific helpers. The separator character is **not exported** — only the functions are.

```typescript
// packages/common/util/src/composite-key.ts

const SEPARATOR = ':';

/**
 * Build a composite key from parts. Each part is validated to not contain the separator.
 */
export const compositeKey = (...parts: string[]): string => {
  if (import.meta.env?.DEV) {
    for (const part of parts) {
      invariant(!part.includes(SEPARATOR), `Composite key part must not contain '${SEPARATOR}': ${part}`);
    }
  }
  return parts.join(SEPARATOR);
};

/**
 * Split a composite key back into its parts.
 */
export const splitCompositeKey = (key: string): string[] => key.split(SEPARATOR);
```

### Phase 2: Domain-specific helpers

Each use case wraps `compositeKey` (or uses its own separator internally) with a named function that makes intent clear. Examples:

```typescript
// packages/core/echo/echo-db/src/queue/queue-key.ts
import { compositeKey } from '@dxos/util';

/** Key for queue lookups: `subspaceTag:spaceId:queueId`. */
export const queueKey = (subspaceTag: string, spaceId: SpaceId, queueId: ObjectId): string =>
  compositeKey(subspaceTag, spaceId, queueId);

// packages/sdk/observability/src/storage/storage-key.ts
import { compositeKey } from '@dxos/util';

/** Scoped browser storage key: `namespace:key`. */
export const storageKey = (namespace: string, key: string): string =>
  compositeKey(namespace, key);

// packages/sdk/app-framework/src/core/activation-event-key.ts
import { compositeKey } from '@dxos/util';

/** Activation event key: `eventId:specifier`. */
export const activationEventKey = (eventId: string, specifier: string): string =>
  compositeKey(eventId, specifier);

// packages/core/echo/echo-pipeline/src/query/result-key.ts
import { compositeKey } from '@dxos/util';

/** Unique result key across spaces and documents. */
export const resultKey = (spaceId: string, documentId: string, objectId: string): string =>
  compositeKey(spaceId, documentId, objectId);
```

### Phase 3: Encapsulate prefix markers behind helpers

Stop exporting prefix constants (`COMPANION_PREFIX`, `ATTENDABLE_PATH_SEPARATOR`) and the `!dxos:` convention. Replace with helper functions.

```typescript
// packages/sdk/app-toolkit/src/paths.ts

const COMPANION_PREFIX = '~'; // private, no longer exported
const PINNED_WORKSPACE_PREFIX = '!dxos:'; // private

/** Build a companion node ID from a parent path and variant name. */
export const companionId = (parentPath: string, variant: string): string =>
  `${parentPath}/${COMPANION_PREFIX}${variant}`;

/** Extract the companion variant name from a qualified companion node ID. */
export const getCompanionVariant = (qualifiedId: string): string => {
  const lastSegment = qualifiedId.split('/').pop() ?? '';
  return lastSegment.startsWith(COMPANION_PREFIX) ? lastSegment.slice(COMPANION_PREFIX.length) : lastSegment;
};

/** Check whether the last segment of a qualified ID is a companion. */
export const isCompanion = (qualifiedId: string): boolean => {
  const lastSegment = qualifiedId.split('/').pop() ?? '';
  return lastSegment.startsWith(COMPANION_PREFIX);
};

/** Build a pinned workspace ID. */
export const pinnedWorkspaceId = (name: string): string =>
  `${PINNED_WORKSPACE_PREFIX}${name}`;

/** Build a qualified path to a pinned workspace. */
export const getPinnedWorkspacePath = (name: string): string =>
  `${Node.RootId}/${pinnedWorkspaceId(name)}`;
```

Migrate existing call sites:
- `${COMPANION_PREFIX}settings` → `companionId(parentPath, 'settings')` (or just the segment: use a `companionSegment('settings')` helper if the full path isn't available)
- `!dxos:settings` → `pinnedWorkspaceId('settings')`
- `!dxos:plugin-registry` → `pinnedWorkspaceId('plugin-registry')`

Similarly for plugin-registry's `>` separator:
```typescript
// packages/plugins/plugin-registry/src/meta.ts

const CATEGORY_SEPARATOR = '>'; // private

/** Build a registry category node ID. */
export const registryCategoryId = (registryKey: string, category: string): string =>
  `${registryKey}${CATEGORY_SEPARATOR}${category}`;
```

### Phase 4: Shared `PropertyPath` utility

For dot-separated property paths. Several packages already have inline `.join('.')` / `.split('.')` for this.

```typescript
// packages/common/util/src/property-path.ts

const SEPARATOR = '.';

export const PropertyPath = {
  create: (...segments: string[]) => segments.join(SEPARATOR),
  parts: (path: string) => path.split(SEPARATOR),
  append: (path: string, segment: string) => path ? `${path}${SEPARATOR}${segment}` : segment,
};
```

### Phase 5: Refactor app-graph to stop exporting `Separators`

The `Separators` constant in `app-graph/src/util.ts` should become a private implementation detail. The helpers (`qualifyId`, `relationKey`, `connectionKey`, etc.) already encapsulate the separator logic — consumers should use those, not the raw characters.

1. Make `Separators` non-exported (or move to an internal module).
2. Audit any external packages that import `Separators` directly and migrate them to use the helper functions.
3. If any external usage genuinely needs the raw character, add a purpose-built helper instead.

### Phase 6: Migrate ad-hoc colon separators to domain helpers

Prioritize by collision risk:

**High priority** (parts could theoretically contain `:`):
- `${namespace}:${OBSERVABILITY_KEY}` in observability/browser.ts — namespace is user-configurable.
- `${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}` in plugin-settings — actively puts colons into the value. This needs a different encoding entirely (e.g., URL-encode the `/` instead of replacing with `:`).
- `${path}:${handle.name}` in plugin-files — file names could contain `:`.

**Medium priority** (parts are validated IDs, low collision risk, but should still use domain helpers for clarity):
- `${subspaceTag}:${spaceId}:${queueId}` in queue-service → `queueKey()`
- `${spaceId}:${documentId}:${objectId}` in query-executor → `resultKey()`
- `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}` in echo-pipeline, space-proxy → `serviceKey()`
- `${event.id}:${event.specifier}` in activation-event → `activationEventKey()`

**Low priority / skip** (well-scoped, local usage, or already has its own format):
- DXN — has its own `DXN.parse()`/`toString()` with validation. Leave as-is.
- Voxel coordinates `${x}:${y}:${z}` — numeric parts, zero collision risk, local to one package.
- Text selection ranges `${from}:${to}` — numeric, local usage.
- Network addresses `${ip}:${port}` — standard host:port convention.

### Phase 7: Migrate ad-hoc dot separators

Migrate the ~20 ad-hoc dot-separator sites to use `PropertyPath`. Lower risk since they're mostly used for display/logging, but the helper makes intent clearer:
- `${path}.${key}` in codec-protobuf sanitizer
- `${className}.${methodName}` in tracing, rpc, debug
- Form field paths in react-ui-form

### Phase 8: Document and lint

- Add an entry to the SDK guide documenting the separator taxonomy.
- Consider an ESLint rule (or a note in CLAUDE.md) that flags new template literals containing `\$\{.*\}:\$\{` and suggests using a domain-specific helper.
- Add a table in `.agents/sdk/` mapping each separator character to its sanctioned usage.

## What NOT to change

- **DXN format**: Has its own well-defined parser/serializer. Colon is part of the `dxn:` URI scheme. Leave it alone.
- **React keys using `-`**: These are purely for React reconciliation, not for parsing. No helper needed.
- **Human-readable debug strings**: `${className}#${id}` and similar patterns are for logs/devtools. Over-abstracting these adds noise.
- **`headsCodec`**: Already has encode/decode. The `|` separator is well-contained.
- **`Path` in react-ui-list**: Well-designed, scoped to one package, uses `+` which avoids collisions.
- **Network addresses and URLs**: `host:port`, WebSocket URLs, etc. are standard formats.

## Migration Strategy

1. Introduce `compositeKey` in `@dxos/util` (Phase 1) — no breaking changes.
2. Build domain-specific helpers alongside existing code (Phase 2) — no breaking changes.
3. Encapsulate prefix markers behind helpers (Phase 3) — may need deprecation of exported constants.
4. Migrate call sites package-by-package in small PRs grouped by domain (Phase 6-7).
5. Refactor `Separators` export in app-graph (Phase 5) — may need a deprecation period if external packages import it.
6. Each PR should be independently mergeable and testable.
7. The high-priority Phase 6 items (where collision risk is real) should be addressed first.
8. Phase 7 and 8 can happen opportunistically — no urgency since dot paths are lower risk.

## Open Questions

1. **Should `compositeKey` use a control character instead of `:`?** Using `\u0001` like app-graph would eliminate all collision risk, but produces non-human-readable keys that are harder to debug. Colon is a good middle ground for keys that show up in storage, URLs, and logs.

2. **Should DXN adopt `compositeKey` internally?** DXN already validates that parts don't contain `:`, so it would work. But DXN has its own parse/format contract and schema validation — forcing it through a generic helper may be more coupling than it's worth.

3. **Should `plugin-settings` stop doing `.replaceAll('/', ':')`?** This is the most concerning pattern — it actively introduces colons into a colon-separated key. It should probably use a different encoding (e.g., URL-encode the `/` or use a different separator for the settings key).
