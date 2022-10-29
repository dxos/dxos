# Interface `ClientProviderProps`
> Declared in [`packages/sdk/react-client/src/containers/ClientProvider.tsx`]()


## Properties
### [`children`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L21)
Type: `ReactNode`
### [`client`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L34)
Type: [`ClientProvider`](/api/@dxos/react-client/functions/ClientProvider)

Client object or async provider to enable to caller to do custom initialization.
### [`clientRef`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L29)
Type: `MutableRefObject<undefined | Client>`

Forward reference to provide client object to outercontainer since it won't have access to the context.
### [`config`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L44)
Type: `ConfigProvider`

Config object or async provider.
### [`fallback`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L39)
Type: `ReactNode`

ReactNode to display until the client is available.
### [`onInitialize`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L55)
Type: `function`
### [`options`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L49)
Type: `ClientOptions`

Runtime objects.