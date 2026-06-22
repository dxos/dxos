# `@dxos/echo-doc` — design notes

## Factoring `Doc` out of `@dxos/echo-client`

`@dxos/echo-doc` currently depends on `@dxos/echo-client` for `createObject`,
`getObjectCore`, and `isEchoObject` (see the `// TODO(burdon)` in `src/Doc.ts`).
This note records why that dependency exists and how to reduce it.

### The two things tangled together

"Factoring out `Doc`" is two separable extractions that the current code conflates:

| Piece | What it is | Real dependencies |
|---|---|---|
| **A. The `Doc` type surface** | `automerge/Doc.ts` — `Handle`, `Accessor`, `KeyPath`, `isKeyPath`, `getValue` | `@automerge/automerge` (types only) + `@dxos/util` (`getDeep`). Nothing else. |
| **B. The accessor *binding*** | `createAccessor` (echo-doc) + `getDocAccessor` (`ObjectCore`) | The whole `ObjectCore` → `createObject` / `getObjectCore` / `isEchoObject` chain |

Piece A is trivially extractable and nearly dependency-free. Piece B is the one
that drags in `ObjectCore` (and therefore automerge-repo, encode/decode, the proxy
layer). All of the difficulty of "echo-doc shouldn't depend on echo-client" lives in B.

### Why B is hard

`createAccessor` calls `getObjectCore(live).getDocAccessor(path)`. `getDocAccessor`
closes over `this.getDoc/change/changeAt` and the `updates` event — so the
`Accessor` it returns is **a live view onto an `ObjectCore`**. You cannot get an
accessor without an `ObjectCore`, and `ObjectCore` is irreducibly automerge-bound
(`A.from`, `A.change`, `DocHandleProxy`).

The dependency is therefore *structural*, not incidental: the accessor abstraction
is defined over `ObjectCore`'s CRDT lifecycle.

## Recommendation — Option 2: extract `@dxos/echo-core`

Move `ObjectCore` and the object-creation utilities down into a new package that
both `@dxos/echo-client` and `@dxos/echo-doc` depend on. echo-doc then depends on
`@dxos/echo-core` (~13 deps) instead of `@dxos/echo-client` (~25 deps), dropping
the heavy non-automerge deps it never needed (`echo-host`, `edge-client`,
`sql-sqlite`, `teleport`, `kv-store`, `index-core`, `codec-protobuf`,
`@effect/experimental`, `@effect/sql`, `@effect-atom/atom`). Automerge stays —
that is unavoidable for anything that touches `ObjectCore`.

### Proposed package layout

```
packages/core/echo/echo-core/src/
  index.ts
  automerge/Doc.ts          ← Handle, Accessor, KeyPath, isKeyPath, getValue
  core-db/object-core.ts    ← ObjectCore
  core-db/types.ts          ← TargetKey, DecodedAutomergePrimaryValue, ...
  echo-handler/
    echo-array.ts
    echo-handler.ts         ← createObject, EchoReactiveHandler
    echo-object-utils.ts    ← getObjectCore, isEchoObject
    echo-proxy-target.ts    ← ProxyTarget, symbols
```

- `@dxos/echo-client` keeps the DB / space / query / hypergraph layer and depends
  on `@dxos/echo-core`.
- `@dxos/echo-doc` depends on `@dxos/echo-core` instead of `@dxos/echo-client`.
- New package must carry `"private": true` until a trusted publisher is configured.

### Migration steps

1. Scaffold `@dxos/echo-core` (`"private": true`, `moon.yml`, `tsconfig`).
2. Move the files above; update intra-package import paths.
3. Repoint `@dxos/echo-client` imports of `ObjectCore` / `createObject` /
   `getObjectCore` / `isEchoObject` / the `Doc` namespace to `@dxos/echo-core`.
   Leave **no** compatibility re-exports behind — update every call site.
4. Switch `@dxos/echo-doc` to depend on `@dxos/echo-core`; drop the
   `@dxos/echo-client` dependency from its `package.json`.
5. Audit the diff for new casts; build + lint + test the affected graph.

### Resolved as a side effect

`ObjectCore.database` is currently typed `unknown` to dodge a circular dep with
`proxy-db` inside echo-client. Once `ObjectCore` lives in `@dxos/echo-core` and
`proxy-db` stays in `@dxos/echo-client`, the layering is one-directional and the
field can be typed properly (or the bridge removed).

### Scope

Mechanical but broad (≈8 files moved, all import paths updated). No public API
change for consumers. Best done as its own follow-up PR.

## Alternatives considered

- **Option 1 — extract only the `Doc` type surface (Piece A).** Relocates the
  types but `createAccessor` still needs `ObjectCore`, so echo-doc keeps its
  runtime dependency on echo-client. Low value; doesn't cut dependency weight.
- **Option 3 — invert via an `AccessorProvider` seam.** echo-doc declares
  `interface AccessorProvider { getAccessor(obj, path): Doc.Accessor }` and
  `createAccessor` takes an injected provider (mirroring `RefResolver`);
  echo-client registers the concrete `ObjectCore`-backed implementation. echo-doc
  becomes a true leaf with zero knowledge of `ObjectCore`. More ceremony at call
  sites — only worth it if a second, non-ECHO automerge backend ever needs the
  accessor surface. Can layer on top of Option 2 later.
