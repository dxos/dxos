---
title: Functions
---
# Functions
### [mountDevtoolsHooks(options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/devtools/devtools.ts#L52)




Returns: <code>void</code>

Arguments: 

`options`: <code>[MountOptions](/api/@dxos/client/types/MountOptions)</code>


### [unmountDevtoolsHooks()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/devtools/devtools.ts#L172)




Returns: <code>void</code>

Arguments: none




### [createDefaultModelFactory()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/util.ts#L14)




Returns: <code>ModelFactory</code>

Arguments: none




### [createDocAccessor(text)]()




Returns: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;T&gt;</code>

Arguments: 

`text`: <code>[TextObject](/api/@dxos/client/classes/TextObject) | EchoReactiveObject&lt;object&gt;</code>


### [createSubscription(onUpdate)]()


Subscribe to database updates.
Calls the callback when any object from the selection changes.
Calls the callback when the selection changes.
Always calls the callback on the first  `selection.update`  call.

Returns: <code>[SubscriptionHandle](/api/@dxos/client/interfaces/SubscriptionHandle)</code>

Arguments: 

`onUpdate`: <code>function</code>


### [fromCursor(object, cursor)]()




Returns: <code>number</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/client/classes/TextObject)</code>

`cursor`: <code>string</code>


### [getRawDoc(obj, \[path\])]()




Returns: <code>[DocAccessor](/api/@dxos/client/interfaces/DocAccessor)&lt;any&gt;</code>

Arguments: 

`obj`: <code>OpaqueEchoObject</code>

`path`: <code>KeyPath</code>


### [getSpaceForObject(object)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/util.ts#L22)




Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`object`: <code>OpaqueEchoObject</code>


### [getTextContent(object, defaultValue)]()




Returns: <code>string</code>

Arguments: 

`object`: <code>undefined | [TextObject](/api/@dxos/client/classes/TextObject) | EchoReactiveObject&lt;object&gt;</code>

`defaultValue`: <code>string</code>


### [getTextInRange(object, begin, end)]()


TODO(dima?): This API will change.

Returns: <code>string</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/client/classes/TextObject)</code>

`begin`: <code>string</code>

`end`: <code>string</code>


### [hasType(schema)]()




Returns: <code>function</code>

Arguments: 

`schema`: <code>[Schema](/api/@dxos/client/classes/Schema)</code>


### [isAutomergeObject(object)]()




Returns: <code>object is AutomergeObject</code>

Arguments: 

`object`: <code>unknown</code>


### [isTypedObject(object)]()




Returns: <code>object is [TypedObject](/api/@dxos/client/types/TypedObject)&lt;Record&lt;string, any&gt;&gt;</code>

Arguments: 

`object`: <code>unknown</code>


### [setTextContent(object, text)]()




Returns: <code>void</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/client/classes/TextObject)</code>

`text`: <code>string</code>


### [toCursor(object, pos)]()




Returns: <code>string</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/client/classes/TextObject)</code>

`pos`: <code>number</code>


### [Remote(target)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/client-services-factory.tsx#L15)




Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`target`: <code>undefined | string</code>


### [createClientServices(config, \[createWorker\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/client-services-factory.tsx#L41)


Create services from config.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`createWorker`: <code>function</code>


### [fromAgent(options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L29)


Connects to locally running CLI daemon.

Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`options`: <code>[FromAgentOptions](/api/@dxos/client/types/FromAgentOptions)</code>


### [fromHost(config, \[params\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L19)


Creates stand-alone services without rpc.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`params`: <code>ClientServicesHostParams</code>


### [fromIFrame(config, options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/utils.ts#L21)


Create services provider proxy connected via iFrame to host.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`options`: <code>Omit&lt;Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)&gt;, "source"&gt;</code>


### [fromSocket(url)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/socket.ts#L12)


Access to remote client via a socket.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`url`: <code>string</code>


### [fromWorker(config, options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L23)


Creates services provider connected via worker.

Returns: <code>Promise&lt;[WorkerClientServices](/api/@dxos/client/classes/WorkerClientServices)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`options`: <code>Omit&lt;WorkerClientServicesParams, "config"&gt;</code>


### [getUnixSocket(profile, protocol)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L19)




Returns: <code>string</code>

Arguments: 

`profile`: <code>string</code>

`protocol`: <code>string</code>


### [joinCommonSpace(options, \[spaceKey\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L193)




Returns: <code>Promise&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>

Arguments: 

`options`: <code>[Client](/api/@dxos/react-client/classes/Client)[]</code>

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


### [performInvitation(options)]()




Returns: <code>[Promise&lt;Result&gt;, Promise&lt;Result&gt;]</code>

Arguments: 

`options`: <code>PerformInvitationParams</code>


### [syncItemsAutomerge(db1, db2)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L185)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`db1`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>

`db2`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>


### [testSpaceAutomerge(create, check)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L165)




Returns: <code>Promise&lt;object&gt;</code>

Arguments: 

`create`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>

`check`: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>


### [waitForSpace(client, spaceKey, options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/utils.ts#L16)




Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

`options`: <code>Options</code>


