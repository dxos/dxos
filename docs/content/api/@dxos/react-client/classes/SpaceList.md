# Class `SpaceList`
<sub>Declared in [packages/sdk/client/dist/types/src/echo/space-list.d.ts:12]()</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_config, _serviceProvider, _modelFactory, _graph, _getIdentityKey)]()




Returns: <code>[SpaceList](/api/@dxos/react-client/classes/SpaceList)</code>

Arguments: 

`_config`: <code>undefined | [Config](/api/@dxos/react-client/classes/Config)</code>

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_graph`: <code>Hypergraph</code>

`_getIdentityKey`: <code>function</code>



## Properties
### [_value]()
Type: <code>[Space](/api/@dxos/react-client/interfaces/Space)[]</code>



### [default]()
Type: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

Returns the default space.

### [isReady]()
Type: <code>MulticastObservable&lt;boolean&gt;</code>

Resolves when the default space is available.

### [modelFactory]()
Type: <code>ModelFactory</code>




## Methods
### [\[custom\]()]()




Returns: <code>string</code>

Arguments: none




### [\[observable\]()]()




Returns: <code>Observable&lt;[Space](/api/@dxos/react-client/interfaces/Space)[]&gt;</code>

Arguments: none




### [addSchema(schema)]()




Returns: <code>void</code>

Arguments: 

`schema`: <code>[TypeCollection](/api/@dxos/react-client/classes/TypeCollection)</code>


### [concat(observables)]()




Returns: <code>MulticastObservable&lt;R&gt;</code>

Arguments: 

`observables`: <code>Observable&lt;R&gt;[]</code>


### [create(\[meta\])]()


Creates a new space.

Returns: <code>Promise&lt;[Space](/api/@dxos/react-client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/react-client/types/PropertiesProps)</code>


### [filter(callback)]()




Returns: <code>MulticastObservable&lt;[Space](/api/@dxos/react-client/interfaces/Space)[]&gt;</code>

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


### [get(spaceKey)]()


Returns the space with the given key.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


### [join(invitation)]()


Joins an existing space using the given invitation.

Returns: <code>[AuthenticatingInvitation](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>string | [Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>


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


### [query(\[filter\], \[options\])]()


Query all spaces.

Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;T&gt;</code>

Arguments: 

`filter`: <code>[FilterSource](/api/@dxos/react-client/types/FilterSource)&lt;T&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/react-client/interfaces/QueryOptions)</code>


### [reduce(callback, \[initialValue\])]()




Returns: <code>MulticastObservable&lt;R&gt;</code>

Arguments: 

`callback`: <code>function</code>

`initialValue`: <code>R</code>


### [setIndexConfig(config)]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`config`: <code>IndexConfig</code>


### [subscribe(onNext, \[onError\], \[onComplete\])]()




Returns: <code>Subscription</code>

Arguments: 

`onNext`: <code>function</code>

`onError`: <code>function</code>

`onComplete`: <code>function</code>


### [toJSON()]()




Returns: <code>object</code>

Arguments: none




### [wait(\[options\])]()


Wait for the observable to complete.

Returns: <code>Promise&lt;[Space](/api/@dxos/react-client/interfaces/Space)[]&gt;</code>

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


