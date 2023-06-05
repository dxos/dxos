# Class `CancellableInvitationObservable`
<sub>Declared in [packages/sdk/client-protocol/dist/types/src/invitations/invitations.d.ts:15]()</sub>


Base class for all invitation observables and providers.


## Constructors
### [constructor(options)]()



Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>object</code>


## Properties


## Methods
### [\[observable\]()]()



Returns: <code>Observable&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

Arguments: none

### [cancel()]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [concat(observable)]()



Returns: <code>Observable&lt;R&gt;</code>

Arguments: 

`observable`: <code>Observable&lt;R&gt;[]</code>

### [filter(callback)]()



Returns: <code>Observable&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

Arguments: 

`callback`: <code>function</code>

### [flatMap(callback)]()



Returns: <code>Observable&lt;R&gt;</code>

Arguments: 

`callback`: <code>function</code>

### [forEach(callback)]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`callback`: <code>function</code>

### [get()]()



Get the current value of the observable.


Returns: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

Arguments: none

### [map(callback)]()



Returns: <code>Observable&lt;R&gt;</code>

Arguments: 

`callback`: <code>function</code>

### [reduce(callback, \[initialValue\])]()



Returns: <code>Observable&lt;R&gt;</code>

Arguments: 

`callback`: <code>function</code>

`initialValue`: <code>R</code>

### [subscribe(onNext, \[onError\], \[onComplete\])]()



Returns: <code>Subscription</code>

Arguments: 

`onNext`: <code>function</code>

`onError`: <code>function</code>

`onComplete`: <code>function</code>

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
