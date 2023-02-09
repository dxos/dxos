# Interface `Invitation`
> Declared in [`packages/core/protocols/dist/src/proto/gen/dxos/client/services.d.ts`]()

Represents the invitation state passed between client and service.

Defined in:
   file://./../../../dxos/client/services.proto
## Properties
### [authenticationCode]()
Type: <code>string</code>

Authentication code created by host.

Options:
  - proto3_optional = true
### [error]()
Type: <code>[Error](/api/@dxos/react-client/enums#Error)</code>

Error.

Options:
  - proto3_optional = true
### [identityKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Guest's identity (only present if OFFLINE).

Options:
  - proto3_optional = true
### [invitationId]()
Type: <code>string</code>

Local identifier.

Options:
  - proto3_optional = true
### [spaceKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Space to join.

Options:
  - proto3_optional = true
### [state]()
Type: <code>[State](/api/@dxos/react-client/enums#State)</code>

Local state.

Options:
  - proto3_optional = true
### [swarmKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Swarm rendezvous (random).

Options:
  - proto3_optional = true
### [timeout]()
Type: <code>number</code>

Timeout (ms).

Options:
  - proto3_optional = true
### [type]()
Type: <code>[Type](/api/@dxos/react-client/enums#Type)</code>

Determined when created.

Options:
  - proto3_optional = true