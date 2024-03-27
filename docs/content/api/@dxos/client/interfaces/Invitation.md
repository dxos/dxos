# Interface `Invitation`
> Declared in [`packages/core/protocols/dist/esm/src/proto/gen/dxos/client/services.d.ts`]()

Represents the invitation state passed between client and service.

Defined in:
   file://./../../../dxos/client/services.proto
## Properties
### [authCode]()
Type: <code>string</code>

Authentication code created by host (only present if auth_method is SHARED_SECRET).

Options:
  - proto3_optional = true

### [authMethod]()
Type: <code>[AuthMethod](/api/@dxos/client/enums#AuthMethod)</code>

How the invitation is authenticated.

### [created]()
Type: <code>Date</code>

Options:
  - proto3_optional = true

### [identityKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Guest's identity.

Options:
  - proto3_optional = true

### [invitationId]()
Type: <code>string</code>

Local identifier (random).

### [kind]()
Type: <code>[Kind](/api/@dxos/client/enums#Kind)</code>

Kind of access the invitation will grant.

### [lifetime]()
Type: <code>number</code>

Options:
  - proto3_optional = true

### [persistent]()
Type: <code>boolean</code>

Host should resume invitation on startup until timeout.

Options:
  - proto3_optional = true

### [spaceKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Space to join (only present if kind is SPACE).

Options:
  - proto3_optional = true

### [state]()
Type: <code>[State](/api/@dxos/client/enums#State)</code>

Local state.

### [swarmKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Swarm rendezvous (random).

### [target]()
Type: <code>string</code>

Path or identifier to navigate to after successful authentication.

Options:
  - proto3_optional = true

### [timeout]()
Type: <code>number</code>

Timeout for guest to complete invitation once connected (ms).

Options:
  - proto3_optional = true

### [type]()
Type: <code>[Type](/api/@dxos/client/enums#Type)</code>

Determines the behavior of the invitation.

    