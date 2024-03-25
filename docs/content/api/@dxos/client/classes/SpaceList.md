# Class `SpaceList`
<sub>Declared in [packages/sdk/client/src/echo/space-list.ts:47](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L47)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_config, _serviceProvider, _modelFactory, _graph, _getIdentityKey)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L66)




Returns: <code>[SpaceList](/api/@dxos/client/classes/SpaceList)</code>

Arguments: 

`_config`: <code>undefined | [Config](/api/@dxos/react-client/classes/Config)</code>

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_graph`: <code>Hypergraph</code>

`_getIdentityKey`: <code>function</code>



## Properties
### [_value]()
Type: <code>[Space](/api/@dxos/client/interfaces/Space)[]</code>



### [default](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L247)
Type: <code>[Space](/api/@dxos/client/interfaces/Space)</code>

Returns the default space.

### [isReady](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L227)
Type: <code>MulticastObservable&lt;boolean&gt;</code>

Resolves when the default space is available.

### [modelFactory](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L96)
Type: <code>ModelFactory</code>




## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L85)




Returns: <code>string</code>

Arguments: none




### [\[observable\]()]()




Returns: <code>Observable&lt;[Space](/api/@dxos/client/interfaces/Space)[]&gt;</code>

Arguments: none




### [addSchema(schema)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L315)




Returns: <code>void</code>

Arguments: 

`schema`: <code>[TypeCollection](/api/@dxos/client/classes/TypeCollection)</code>


### [concat(observables)]()




Returns: <code>MulticastObservable&lt;R&gt;</code>

Arguments: 

`observables`: <code>Observable&lt;R&gt;[]</code>


### [create(\[meta\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L257)


Creates a new space.

Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/client/types/PropertiesProps)</code>


### [filter(callback)]()




Returns: <code>MulticastObservable&lt;[Space](/api/@dxos/client/interfaces/Space)[]&gt;</code>

Arguments: 

`callback`: <code>function</code>


### [flatMap(callback)]()




Returns: <code>MulticastObservable&lt;R&gt;</code>

Arguments: 

`callback`: <code>function</code>


### [forEach(callback)]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`callback`: <code>function</code>


### [get(spaceKey)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L231)


Returns the space with the given key.

Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


### [join(invitation)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L303)


Joins an existing space using the given invitation.

Returns: <code>[AuthenticatingInvitation](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>string | [Invitation](/api/@dxos/client/interfaces/Invitation)</code>


### [losslessConcat(reducer, observables)]()


Concatenates multicast observables without losing the current value.

Returns: <code>MulticastObservable&lt;R&gt;</code>

Arguments: 

`reducer`: <code>function</code>

`observables`: <code>Observable&lt;R&gt;[]</code>


### [map(callback)]()




Returns: <code>MulticastObservable&lt;R&gt;</code>

Arguments: 

`callback`: <code>function</code>


### [query(\[filter\], \[options\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L324)


Query all spaces.

Returns: <code>[Query](/api/@dxos/client/classes/Query)&lt;T&gt;</code>

Arguments: 

`filter`: <code>[FilterSource](/api/@dxos/client/types/FilterSource)&lt;T&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/client/interfaces/QueryOptions)</code>


### [reduce(callback, \[initialValue\])]()




Returns: <code>MulticastObservable&lt;R&gt;</code>

Arguments: 

`callback`: <code>function</code>

`initialValue`: <code>R</code>


### [setIndexConfig(config)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L208)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`config`: <code>IndexConfig</code>


### [subscribe(onNext, \[onError\], \[onComplete\])]()




Returns: <code>Subscription</code>

Arguments: 

`onNext`: <code>function</code>

`onError`: <code>function</code>

`onComplete`: <code>function</code>


### [toJSON()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/echo/space-list.ts#L90)




Returns: <code>object</code>

Arguments: none




### [wait(\[options\])]()


Wait for the observable to complete.

Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)[]&gt;</code>

Arguments: 

`options`: <code>object</code>


### [empty()]()




Returns: <code>MulticastObservable&lt;"null"&gt;</code>

Arguments: none




### [from(value, \[initialValue\])]()




Returns: <code>MulticastObservable&lt;T&gt;</code>

Arguments: 

`value`: <code>Observable&lt;T&gt; | ObservableLike&lt;T&gt; | ArrayLike&lt;T&gt; | Event&lt;T&gt;</code>

`initialValue`: <code>T</code>


### [of(items)]()




Returns: <code>MulticastObservable&lt;T&gt;</code>

Arguments: 

`items`: <code>T[]</code>


