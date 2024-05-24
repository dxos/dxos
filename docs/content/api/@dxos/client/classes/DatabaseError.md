# Class `DatabaseError`
<sub>Declared in [packages/core/protocols/dist/esm/src/errors/base-errors.d.ts:25]()</sub>


Database errors.

## Constructors
### [constructor(code, \[message\], \[context\])]()




Returns: <code>[DatabaseError](/api/@dxos/client/classes/DatabaseError)</code>

Arguments: 

`code`: <code>string</code>

`message`: <code>string</code>

`context`: <code>Record&lt;string, any&gt;</code>



## Properties
### [cause]()
Type: <code>unknown</code>



### [code]()
Type: <code>string</code>



### [context]()
Type: <code>Record&lt;string, any&gt;</code>



### [message]()
Type: <code>string</code>



### [name]()
Type: <code>string</code>



### [stack]()
Type: <code>string</code>



### [prepareStackTrace]()
Type: <code>function</code>

Optional override for formatting stack traces

### [stackTraceLimit]()
Type: <code>number</code>




## Methods
### [captureStackTrace(targetObject, \[constructorOpt\])]()


Create .stack property on a target object

Returns: <code>void</code>

Arguments: 

`targetObject`: <code>object</code>

`constructorOpt`: <code>Function</code>


