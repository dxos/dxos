# Interface `LayoutRequest`
> Declared in [`packages/core/protocols/dist/esm/src/proto/gen/dxos/iframe.d.ts`]()

Defined in:
   file://./../../dxos/iframe.proto
## Properties
### [invitationCode]()
Type: <code>string</code>

Invitation code to join a space.

Options:
  - proto3_optional = true

### [layout]()
Type: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

Determins which panel of the shell is opened.

### [spaceKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Key of the space to share.

Options:
  - proto3_optional = true

### [target]()
Type: <code>string</code>

Target to include in an invitation for redirecting after a successful invitation.

Options:
  - proto3_optional = true

    