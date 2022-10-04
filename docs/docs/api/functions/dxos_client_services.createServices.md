# Function: createServices

[@dxos/client-services](../modules/dxos_client_services.md).createServices

**createServices**(`__namedParameters`): `Omit`<[`ClientServices`](../types/dxos_client_services.ClientServices.md), ``"DevtoolsHost"``\>

Service factory.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.config` | `Config` |
| `__namedParameters.context` | [`ServiceContext`](../classes/dxos_client_services.ServiceContext.md) |
| `__namedParameters.echo` | `any` |
| `__namedParameters.signer?` | [`HaloSigner`](../interfaces/dxos_client_services.HaloSigner.md) |

#### Returns

`Omit`<[`ClientServices`](../types/dxos_client_services.ClientServices.md), ``"DevtoolsHost"``\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-factory.ts:15](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-factory.ts#L15)
