# Interface `EchoObject`
> Declared in [`packages/core/echo/echo-schema/dist/types/src/object/types.d.ts`]()

Shared interface of all echo objects.
May be behind a proxy for key-value documents.
## Properties
### [[base]]()
Type: <code>AbstractEchoObject&lt;any&gt; | AutomergeObject</code>

Returns the underlying object.
Same as  `this`  for non-proxied objects.

### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/react-client/interfaces/EchoDatabase)</code>

The database this object belongs to.
Returns  `undefined`  for non-persisted objects.

### [[debug]]()
Type: <code>string</code>

Debug info (ID, schema, etc.)

### [id]()
Type: <code>string</code>



    