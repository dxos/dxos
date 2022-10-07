# Class `CredentialGenerator`
> Declared in [`packages/core/halo/halo-protocol/src/credentials/credential-generator.ts`](https://github.com/dxos/protocols/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-generator.ts#L16)

Utility class for generating credential messages, where the issuer is the current identity or device.

## Constructors
```ts
new CredentialGenerator(
_keyring: Signer,
_identityKey: PublicKey,
_deviceKey: PublicKey
)
```

---
- CredentialGenerator : Class
- constructor : Constructor
- new CredentialGenerator : Constructor signature
- _keyring : Parameter
- _identityKey : Parameter
- _deviceKey : Parameter
- createDeviceAuthorization : Method
- createDeviceAuthorization : Call signature
- deviceKey : Parameter
- createFeedAdmission : Method
- createFeedAdmission : Call signature
- partyKey : Parameter
- feedKey : Parameter
- designation : Parameter
- createMemberInvitation : Method
- createMemberInvitation : Call signature
- partyKey : Parameter
- identityKey : Parameter
- deviceKey : Parameter
- controlKey : Parameter
- dataKey : Parameter
- createSpaceGenesis : Method
- createSpaceGenesis : Call signature
- partyKey : Parameter
- controlKey : Parameter
