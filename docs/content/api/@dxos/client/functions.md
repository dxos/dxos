---
title: Functions
---
# Functions
### [mountDevtoolsHooks(options)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/devtools/devtools.ts#L66)




Returns: <code>void</code>

Arguments: 

`options`: <code>[MountOptions](/api/@dxos/client/types/MountOptions)</code>


### [unmountDevtoolsHooks()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/devtools/devtools.ts#L269)




Returns: <code>void</code>

Arguments: none




### [create(schema, obj, \[meta\])]()


Creates a reactive object from a plain Javascript object.
Optionally provides a TS-effect schema.

Returns: <code>[ReactiveObject](/api/@dxos/client/types/ReactiveObject)&lt;T&gt;</code>

Arguments: 

`schema`: <code>Schema&lt;T, T, never&gt;</code>

`obj`: <code>ExcludeId&lt;T&gt;</code>

`meta`: <code>object</code>


### [createDocAccessor(obj, path)]()




Returns: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;any&gt;</code>

Arguments: 

`obj`: <code>[EchoReactiveObject](/api/@dxos/client/types/EchoReactiveObject)&lt;T&gt;</code>

`path`: <code>KeyPath</code>


### [createEchoObject(init)]()




Returns: <code>[EchoReactiveObject](/api/@dxos/client/types/EchoReactiveObject)&lt;T&gt;</code>

Arguments: 

`init`: <code>T</code>


### [createSubscription(onUpdate)]()


Subscribe to database updates.
Calls the callback when any object from the selection changes.
Calls the callback when the selection changes.
Always calls the callback on the first  `selection.update`  call.

Returns: <code>[SubscriptionHandle](/api/@dxos/client/interfaces/SubscriptionHandle)</code>

Arguments: 

`onUpdate`: <code>function</code>


### [fromCursor(accessor, cursor)]()




Returns: <code>number</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;any&gt;</code>

`cursor`: <code>string</code>


### [fullyQualifiedId(object)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/echo/util.ts#L32)


Fully qualified id of a reactive object is a combination of the space id and the object id.

Returns: <code>string</code>

Arguments: 

`object`: <code>[ReactiveObject](/api/@dxos/client/types/ReactiveObject)&lt;any&gt;</code>


### [getMeta(obj)]()




Returns: <code>object</code>

Arguments: 

`obj`: <code>T</code>


### [getObjectCore(obj)]()




Returns: <code>ObjectCore</code>

Arguments: 

`obj`: <code>[EchoReactiveObject](/api/@dxos/client/types/EchoReactiveObject)&lt;T&gt;</code>


### [getRangeFromCursor(accessor, cursor)]()




Returns: <code>undefined | object</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;any&gt;</code>

`cursor`: <code>string</code>


### [getSchema(obj)]()


Returns the schema for the given object if one is defined.

Returns: <code>undefined | Schema&lt;any, any, never&gt;</code>

Arguments: 

`obj`: <code>undefined | T</code>


### [getSpace(object)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/echo/util.ts#L12)




Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`object`: <code>[ReactiveObject](/api/@dxos/client/types/ReactiveObject)&lt;any&gt;</code>


### [getTextInRange(accessor, start, end)]()




Returns: <code>string</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;any&gt;</code>

`start`: <code>string</code>

`end`: <code>string</code>


### [getType(obj)]()




Returns: <code>undefined | Reference</code>

Arguments: 

`obj`: <code>undefined | T</code>


### [getTypename(obj)]()




Returns: <code>undefined | string</code>

Arguments: 

`obj`: <code>T</code>


### [hasType(type)]()




Returns: <code>function</code>

Arguments: 

`type`: <code>function</code>


### [internalDecodeReference(value)]()




Returns: <code>Reference</code>

Arguments: 

`value`: <code>any</code>


### [isEchoObject(value)]()




Returns: <code>value is [EchoReactiveObject](/api/@dxos/client/types/EchoReactiveObject)&lt;any&gt;</code>

Arguments: 

`value`: <code>unknown</code>


### [isSpace(object)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/echo/util.ts#L25)




Returns: <code>object is [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`object`: <code>unknown</code>


### [loadObjectReferences(objOrArray, valueAccessor, \[timeout\])]()


EXPERIMENTAL - the API is subject to change.

Returns: <code>Promise&lt;[object Object] extends [object Object] ? [object Object] : [object Object]&gt;</code>

Arguments: 

`objOrArray`: <code>T | T[]</code>

`valueAccessor`: <code>function</code>

`timeout`: <code>object</code>


### [toCursor(accessor, pos)]()




Returns: <code>string</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;any&gt;</code>

`pos`: <code>number</code>


### [toCursorRange(accessor, start, end)]()




Returns: <code>string</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;any&gt;</code>

`start`: <code>number</code>

`end`: <code>number</code>


### [Defaults(\[basePath\])]()


JSON config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Dynamics()]()


Provided dynamically by server.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [Envs(\[basePath\])]()


ENV variable (key/value) map.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Local()]()


Development config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [Remote(target, \[authenticationToken\])]()




Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`target`: <code>undefined | string</code>

`authenticationToken`: <code>string</code>


### [Storage()]()


Load config from storage.

Returns: <code>Promise&lt;Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;&gt;</code>

Arguments: none




### [createClientServices(config, \[createWorker\], \[observabilityGroup\], \[signalTelemetryEnabled\])](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/client-services-factory.tsx#L19)


Create services from config.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`createWorker`: <code>function</code>

`observabilityGroup`: <code>string</code>

`signalTelemetryEnabled`: <code>boolean</code>


### [fromAgent(options)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/agent.ts#L31)


Connects to locally running CLI daemon.

Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`options`: <code>[FromAgentOptions](/api/@dxos/client/types/FromAgentOptions)</code>


### [fromHost(config, \[params\], \[observabilityGroup\], \[signalTelemetryEnabled\])](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L25)


Creates stand-alone services without rpc.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`params`: <code>ClientServicesHostParams</code>

`observabilityGroup`: <code>string</code>

`signalTelemetryEnabled`: <code>boolean</code>


### [fromSocket(url, \[authenticationToken\])](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/socket.ts#L14)


Access to remote client via a socket.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`url`: <code>string</code>

`authenticationToken`: <code>string</code>


### [fromWorker(config, options)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/worker-client-services.ts#L24)


Creates services provider connected via worker.

Returns: <code>Promise&lt;[WorkerClientServices](/api/@dxos/client/classes/WorkerClientServices)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`options`: <code>Omit&lt;WorkerClientServicesParams, "config"&gt;</code>


### [getUnixSocket(profile, protocol)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/agent.ts#L21)




Returns: <code>string</code>

Arguments: 

`profile`: <code>string</code>

`protocol`: <code>string</code>


### [createInitializedClientsWithContext(ctx, count, \[options\])](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/testing/utils.ts#L54)




Returns: <code>Promise&lt;[Client](/api/@dxos/client/classes/Client)[]&gt;</code>

Arguments: 

`ctx`: <code>Context</code>

`count`: <code>number</code>

`options`: <code>[CreateInitializedClientsOptions](/api/@dxos/client/types/CreateInitializedClientsOptions)</code>


### [joinCommonSpace(options, \[spaceKey\])](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/testing/test-builder.ts#L197)




Returns: <code>Promise&lt;[PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>

Arguments: 

`options`: <code>[Client](/api/@dxos/client/classes/Client)[]</code>

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>


### [performInvitation(options)]()




Returns: <code>[Promise&lt;Result&gt;, Promise&lt;Result&gt;]</code>

Arguments: 

`options`: <code>PerformInvitationParams</code>


### [syncItemsAutomerge(db1, db2)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/testing/test-builder.ts#L189)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`db1`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>

`db2`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>


### [testSpaceAutomerge(createDb, checkDb)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/testing/test-builder.ts#L181)




Returns: <code>Promise&lt;object&gt;</code>

Arguments: 

`createDb`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>

`checkDb`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>


### [waitForSpace(client, spaceKey, options)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/testing/utils.ts#L22)




Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

`options`: <code>Options</code>


