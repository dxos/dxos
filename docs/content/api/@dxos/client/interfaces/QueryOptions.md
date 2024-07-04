# Interface `QueryOptions`
> Declared in [`packages/core/protocols/dist/esm/src/proto/gen/dxos/echo/filter.d.ts`]()

Defined in:
   file://./../../../dxos/echo/filter.proto
## Properties
### [dataLocation]()
Type: <code>[DataLocation](/api/@dxos/client/enums#DataLocation)</code>

Query only local spaces, or remote on agent.

### [deleted]()
Type: <code>[ShowDeletedOption](/api/@dxos/client/enums#ShowDeletedOption)</code>

Controls how deleted items are filtered.

Options:
  - proto3_optional = true

### [models]()
Type: <code>string[]</code>

Filter by model.

### [spaceIds]()
Type: <code>string[]</code>

Query only in specific spaces.

### [spaces]()
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)[]</code>

Query only in specific spaces.

    