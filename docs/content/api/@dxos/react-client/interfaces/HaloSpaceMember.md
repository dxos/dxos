# Interface `HaloSpaceMember`
> Declared in [`packages/core/protocols/dist/esm/src/proto/gen/dxos/halo/credentials.d.ts`]()

Defined in:
   file://./../../../dxos/halo/credentials.proto
## Properties
### [genesisFeedKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Needed so that the admitted member can start replicating the space based on this credential alone.

### [invitationCredentialId]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

Present to associate SpaceMember admissions with delegated invitations.

Options:
  - proto3_optional = true

### [profile]()
Type: <code>ProfileDocument</code>

Options:
  - proto3_optional = true

### [role]()
Type: <code>[Role](/api/@dxos/react-client/enums#Role)</code>



### [spaceKey]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>



    