# Interface `ClientProviderProps`
> Declared in [`packages/sdk/react-client/src/containers/ClientProvider.tsx`]()


## Properties
### `children: ReactNode`
### `client: ClientProvider`
Client object or async provider to enable to caller to do custom initialization.
### `clientRef: MutableRefObject<undefined | Client>`
Forward reference to provide client object to outercontainer since it won't have access to the context.
### `config: ConfigProvider`
Config object or async provider.
### `fallback: ReactNode`
ReactNode to display until the client is available.
### `onInitialize: function`
### `options: ClientOptions`
Runtime objects.