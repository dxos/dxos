# Interface `ClientProviderProps`
> Declared in [`packages/sdk/react-client/src/client/ClientContext.tsx`]()


## Properties
### [children](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L38)
Type: <code>ReactNode</code>
### [client](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L57)
Type: <code>Client | Provider&lt;Promise&lt;Client&gt;&gt;</code>

Client object or async provider to enable to caller to do custom initialization.

Most apps won't need this.
### [config](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L43)
Type: <code>Config | Provider&lt;Promise&lt;Config&gt;&gt;</code>

Config object or async provider.
### [fallback](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L62)
Type: <code>ReactNode</code>

ReactNode to display until the client is available.
### [onInitialize](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L69)
Type: <code>function</code>
### [services](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L50)
Type: <code>function</code>