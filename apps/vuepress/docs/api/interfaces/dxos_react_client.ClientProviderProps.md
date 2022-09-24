# Interface: ClientProviderProps

[@dxos/react-client](../modules/dxos_react_client.md).ClientProviderProps

## Table of contents

### Properties

- [children](dxos_react_client.ClientProviderProps.md#children)
- [client](dxos_react_client.ClientProviderProps.md#client)
- [clientRef](dxos_react_client.ClientProviderProps.md#clientref)
- [config](dxos_react_client.ClientProviderProps.md#config)
- [onInitialize](dxos_react_client.ClientProviderProps.md#oninitialize)
- [options](dxos_react_client.ClientProviderProps.md#options)

## Properties

### children

• `Optional` **children**: `ReactNode`

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L21)

___

### client

• `Optional` **client**: [`ClientProvider`](../modules/dxos_react_client.md#clientprovider-1)

Client object or async provider to enable to caller to do custom initialization.

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L34)

___

### clientRef

• `Optional` **clientRef**: `MutableRefObject`<`undefined` \| `Client`\>

Forward reference to provide client object to outercontainer since it won't have access to the context.

**`Deprecated`**

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:29](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L29)

___

### config

• `Optional` **config**: `ConfigProvider`

Config object or async provider.

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L39)

___

### onInitialize

• `Optional` **onInitialize**: (`client`: `Client`) => `Promise`<`void`\>

#### Type declaration

▸ (`client`): `Promise`<`void`\>

Post initialization hook.

##### Parameters

| Name | Type |
| :------ | :------ |
| `client` | `Client` |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L50)

___

### options

• `Optional` **options**: `ClientOptions`

Runtime objects.

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:44](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L44)
