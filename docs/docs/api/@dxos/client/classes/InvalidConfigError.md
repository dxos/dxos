# Class `InvalidConfigError`
<sub>Declared in [packages/core/protocols/dist/esm/src/errors/errors.d.ts:44]()</sub>


User facing API Errors.
E.g., something was misconfigured.

## Constructors
### [constructor(\[message\], \[context\])]()




Returns: <code>[InvalidConfigError](/api/@dxos/client/classes/InvalidConfigError)</code>

Arguments: 

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



### [stackTraceLimit]()
Type: <code>number</code>




## Methods
### [captureStackTrace(targetObject, \[constructorOpt\])]()


Create .stack property on a target object

Returns: <code>void</code>

Arguments: 

`targetObject`: <code>object</code>

`constructorOpt`: <code>Function</code>


