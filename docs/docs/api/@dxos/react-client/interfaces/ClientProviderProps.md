# Interface `ClientProviderProps`
> Declared in [`packages/sdk/react-client/src/containers/ClientProvider.tsx`]()


## Properties
### children 
Type: `ReactNode`
### client 
Type: `ClientProvider`

Client object or async provider to enable to caller to do custom initialization.
### clientRef 
Type: `MutableRefObject<undefined | Client>`

Forward reference to provide client object to outercontainer since it won't have access to the context.
### config 
Type: `ConfigProvider`

Config object or async provider.
### fallback 
Type: `ReactNode`

ReactNode to display until the client is available.
### onInitialize 
Type: `function`
### options 
Type: `ClientOptions`

Runtime objects.