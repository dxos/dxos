# Interface `Invitation`
> Declared in [`packages/core/protocols/dist/src/proto/gen/dxos/client/services.d.ts`]()

Represents the invitation state passed between client and service.

Defined in:
   file://./../../../dxos/client/services.proto
## Properties
### [`authenticationCode`]()
Type: `string`

Authentication code created by host.

Options:
  - proto3_optional = true
### [`errorCode`]()
Type: `number`

Local error code.

Options:
  - proto3_optional = true
### [`identityKey`]()
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

Guest's identity (only present if OFFLINE).

Options:
  - proto3_optional = true
### [`invitationId`]()
Type: `string`

Local identifier.

Options:
  - proto3_optional = true
### [`spaceKey`]()
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

Space key (if data invitation).

Options:
  - proto3_optional = true
### [`state`]()
Type: [`State`](/api/@dxos/client/enums#State)

Local state.

Options:
  - proto3_optional = true
### [`swarmKey`]()
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

Swarm rendezvous (random).

Options:
  - proto3_optional = true
### [`timeout`]()
Type: `number`

Timeout (ms).

Options:
  - proto3_optional = true
### [`type`]()
Type: [`Type`](/api/@dxos/client/enums#Type)

Determined when created.

Options:
  - proto3_optional = true