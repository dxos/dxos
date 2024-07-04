# Interface `AppContextRequest`
> Declared in [`packages/core/protocols/dist/esm/src/proto/gen/dxos/iframe.d.ts`]()

Defined in:
   file://./../../dxos/iframe.proto
## Properties
### [display]()
Type: <code>[ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>

The display mode that shell should use.

Options:
  - proto3_optional = true

### [reload]()
Type: <code>boolean</code>

Used after sign out/identity reset.

Options:
  - proto3_optional = true

### [spaceId]()
Type: <code>string</code>

The id of the joined space.

Options:
  - proto3_optional = true

### [spaceKey]()
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

The key of the joined space.

Options:
  - proto3_optional = true

### [target]()
Type: <code>string</code>

Target to redirect to after a successful invitation.

Options:
  - proto3_optional = true

    