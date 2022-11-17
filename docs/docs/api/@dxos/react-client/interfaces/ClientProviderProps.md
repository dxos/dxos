# Interface `ClientProviderProps`
> Declared in [`packages/sdk/react-client/src/client/ClientContext.tsx`]()


## Properties
### [`children`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L41)
Type: `ReactNode`
### [`client`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L54)
Type: [`ClientProvider`](/api/@dxos/react-client/functions/ClientProvider)

Client object or async provider to enable to caller to do custom initialization.
### [`clientRef`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L49)
Type: `MutableRefObject<undefined | Client>`

Forward reference to provide client object to outercontainer since it won't have access to the context.
### [`config`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L64)
Type: `ConfigProvider`

Config object or async provider.
### [`fallback`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L59)
Type: `ReactNode`

ReactNode to display until the client is available.
### [`onInitialize`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L75)
Type: `function`
### [`options`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L69)
Type: `ClientOptions`

Runtime objects.