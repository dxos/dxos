# Class `Client`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/client/client.d.ts:23]()</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(\[options\])]()


Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/react-client/types/ClientOptions)</code>

## Properties
### [version]()
Type: <code>"0.1.23"</code>

The version of this client API
### [config]()
Type: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Current configuration object
### [echo]()
Type: <code>[EchoProxy](/api/@dxos/react-client/classes/EchoProxy)</code>

ECHO database.
### [halo]()
Type: <code>[HaloProxy](/api/@dxos/react-client/classes/HaloProxy)</code>

HALO credentials.
### [initialized]()
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`
### [mesh]()
Type: <code>[MeshProxy](/api/@dxos/react-client/classes/MeshProxy)</code>

## Methods
### [\[custom\]()]()


Returns: <code>string</code>

Arguments: none
### [createSerializer()]()


Returns: <code>[SpaceSerializer](/api/@dxos/react-client/classes/SpaceSerializer)</code>

Arguments: none
### [destroy()]()


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getStatus()]()


Get system status.

Returns: <code>Promise&lt;StatusResponse&gt;</code>

Arguments: none
### [initialize()]()


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [reset()]()


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [resumeHostServices()]()


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [toJSON()]()


Returns: <code>object</code>

Arguments: none