# Class `Identity`
<sub>Declared in [packages/sdk/client-services/src/packlets/identity/identity.ts:35](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L35)</sub>


Agent identity manager, which includes the agent's Halo space.

## Constructors
### [constructor(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L45)


Returns: <code>[Identity](/api/@dxos/client-services/classes/Identity)</code>

Arguments: 

`options`: <code>[IdentityParams](/api/@dxos/client-services/types/IdentityParams)</code>

## Properties
### [deviceKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L41)
Type: <code>PublicKey</code>
### [identityKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L40)
Type: <code>PublicKey</code>
### [stateUpdate](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L43)
Type: <code>Event&lt;void&gt;</code>
### [authorizedDeviceKeys](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L62)
Type: <code>ComplexSet&lt;PublicKey&gt;</code>
### [controlPipeline](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L83)
Type: <code>PipelineAccessor</code>

@test-only
### [haloDatabase](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L95)
Type: <code>Database</code>
### [haloGenesisFeedKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L91)
Type: <code>PublicKey</code>
### [haloSpaceKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L87)
Type: <code>PublicKey</code>

## Methods
### [admitDevice(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L127)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`options`: <code>HaloAdmissionCredentials</code>
### [close()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L70)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getAdmissionCredentials()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L99)


Returns: <code>HaloAdmissionCredentials</code>

Arguments: none
### [getDeviceCredentialSigner()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L123)


Issues credentials as device.

Returns: <code>CredentialSigner</code>

Arguments: none
### [getIdentityCredentialSigner()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L111)


Issues credentials as identity.
Requires identity to be ready.

Returns: <code>CredentialSigner</code>

Arguments: none
### [open()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L66)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [ready()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L74)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none