# Class `Identity`
<sub>Declared in [packages/sdk/client-services/src/packlets/identity/identity.ts:36](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L36)</sub>


Agent identity manager, which includes the agent's Halo space.

## Constructors
### [constructor(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L47)


Returns: <code>[Identity](/api/@dxos/client-services/classes/Identity)</code>

Arguments: 

`options`: <code>[IdentityParams](/api/@dxos/client-services/types/IdentityParams)</code>

## Properties
### [deviceKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L43)
Type: <code>PublicKey</code>
### [identityKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L42)
Type: <code>PublicKey</code>
### [stateUpdate](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L45)
Type: <code>Event&lt;void&gt;</code>
### [authorizedDeviceKeys](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L67)
Type: <code>ComplexSet&lt;PublicKey&gt;</code>
### [controlPipeline](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L92)
Type: <code>PipelineAccessor</code>

@test-only
### [haloDatabase](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L104)
Type: <code>Database</code>
### [haloGenesisFeedKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L100)
Type: <code>PublicKey</code>
### [haloSpaceKey](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L96)
Type: <code>PublicKey</code>
### [profileDocument](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L85)
Type: <code>undefined | ProfileDocument</code>

## Methods
### [admitDevice(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L136)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`options`: <code>HaloAdmissionCredentials</code>
### [close()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L75)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getAdmissionCredentials()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L108)


Returns: <code>HaloAdmissionCredentials</code>

Arguments: none
### [getDeviceCredentialSigner()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L132)


Issues credentials as device.

Returns: <code>CredentialSigner</code>

Arguments: none
### [getIdentityCredentialSigner()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L120)


Issues credentials as identity.
Requires identity to be ready.

Returns: <code>CredentialSigner</code>

Arguments: none
### [open()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L71)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [ready()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L79)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none