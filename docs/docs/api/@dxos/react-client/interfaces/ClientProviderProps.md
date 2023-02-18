# Interface `ClientProviderProps`
> Declared in [`packages/sdk/react-client/src/client/ClientContext.tsx`]()


## Properties
### [children](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L41)
Type: <code>ReactNode</code>
### [client](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L60)
Type: <code>[Client](/api/@dxos/react-client/classes/Client) | Provider&lt;Promise&lt;[Client](/api/@dxos/react-client/classes/Client)&gt;&gt;</code>

Client object or async provider to enable to caller to do custom initialization.

Most apps won't need this.
### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L46)
Type: <code>[Config](/api/@dxos/react-client/classes/Config) | Provider&lt;Promise&lt;[Config](/api/@dxos/react-client/classes/Config)&gt;&gt;</code>

Config object or async provider.
### [fallback](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L65)
Type: <code>FunctionComponent&lt;Partial&lt;[ClientContextProps](/api/@dxos/react-client/types/ClientContextProps)&gt;&gt;</code>

ReactNode to display until the client is available.
### [onInitialize](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L79)
Type: <code>function</code>
### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L53)
Type: <code>function</code>
### [spaceProvider](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L72)
Type: <code>boolean | [SpaceProviderProps](/api/@dxos/react-client/types/SpaceProviderProps)</code>

Whether or not to include a SpaceProvider as a child.

Default is true.