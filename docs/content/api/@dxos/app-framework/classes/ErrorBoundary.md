# Class `ErrorBoundary`
<sub>Declared in [packages/sdk/app-framework/src/plugins/SurfacePlugin/ErrorBoundary.tsx:18](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/ErrorBoundary.tsx#L18)</sub>


Surface error boundary.

For basic usage prefer providing a fallback component to  `Surface` .

For more information on error boundaries, see:
https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

## Constructors
### [constructor(props)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/ErrorBoundary.tsx#L19)




Returns: <code>[ErrorBoundary](/api/@dxos/app-framework/classes/ErrorBoundary)</code>

Arguments: 

`props`: <code>Props</code>



## Properties
### [context]()
Type: <code>unknown</code>

If using the new style context, re-declare this in your class to be the
 `React.ContextType`  of your  `static contextType` .
Should be used with type annotation or static contextType.

 ```ts
static contextType = MyContext
// For TS pre-3.7:
context!: React.ContextType<typeof MyContext>
// For TS 3.7 and above:
declare context: React.ContextType<typeof MyContext>
```

### [props]()
Type: <code>Readonly&lt;Props&gt;</code>



### [refs]()
Type: <code>object</code>



### [state]()
Type: <code>Readonly&lt;State&gt;</code>



### [contextType]()
Type: <code>Context&lt;any&gt;</code>

If set,  `this.context`  will be set at runtime to the current value of the given Context.

Usage:

 ```ts
type MyContext = number
const Ctx = React.createContext<MyContext>(0)

class Foo extends React.Component {
  static contextType = Ctx
  context!: React.ContextType<typeof Ctx>
  render () {
    return <>My context's value: {this.context}</>;
  }
}
```


## Methods
### [UNSAFE_componentWillMount()]()


Called immediately before mounting occurs, and before  `Component#render` .
Avoid introducing any side-effects or subscriptions in this method.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

Returns: <code>void</code>

Arguments: none




### [UNSAFE_componentWillReceiveProps(nextProps, nextContext)]()


Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling  `Component#setState`  generally does not trigger this method.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

Returns: <code>void</code>

Arguments: 

`nextProps`: <code>Readonly&lt;Props&gt;</code>

`nextContext`: <code>any</code>


### [UNSAFE_componentWillUpdate(nextProps, nextState, nextContext)]()


Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call  `Component#setState`  here.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

Returns: <code>void</code>

Arguments: 

`nextProps`: <code>Readonly&lt;Props&gt;</code>

`nextState`: <code>Readonly&lt;State&gt;</code>

`nextContext`: <code>any</code>


### [componentDidCatch(error, errorInfo)]()


Catches exceptions generated in descendant components. Unhandled exceptions will cause
the entire component tree to unmount.

Returns: <code>void</code>

Arguments: 

`error`: <code>Error</code>

`errorInfo`: <code>ErrorInfo</code>


### [componentDidMount()]()


Called immediately after a component is mounted. Setting state here will trigger re-rendering.

Returns: <code>void</code>

Arguments: none




### [componentDidUpdate(prevProps)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/ErrorBoundary.tsx#L28)




Returns: <code>void</code>

Arguments: 

`prevProps`: <code>Props</code>


### [componentWillMount()]()


Called immediately before mounting occurs, and before  `Component#render` .
Avoid introducing any side-effects or subscriptions in this method.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

Returns: <code>void</code>

Arguments: none




### [componentWillReceiveProps(nextProps, nextContext)]()


Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling  `Component#setState`  generally does not trigger this method.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

Returns: <code>void</code>

Arguments: 

`nextProps`: <code>Readonly&lt;Props&gt;</code>

`nextContext`: <code>any</code>


### [componentWillUnmount()]()


Called immediately before a component is destroyed. Perform any necessary cleanup in this method, such as
cancelled network requests, or cleaning up any DOM elements created in  `componentDidMount` .

Returns: <code>void</code>

Arguments: none




### [componentWillUpdate(nextProps, nextState, nextContext)]()


Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call  `Component#setState`  here.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

Returns: <code>void</code>

Arguments: 

`nextProps`: <code>Readonly&lt;Props&gt;</code>

`nextState`: <code>Readonly&lt;State&gt;</code>

`nextContext`: <code>any</code>


### [forceUpdate(\[callback\])]()




Returns: <code>void</code>

Arguments: 

`callback`: <code>function</code>


### [getSnapshotBeforeUpdate(prevProps, prevState)]()


Runs before React applies the result of  `render`  to the document, and
returns an object to be given to componentDidUpdate. Useful for saving
things such as scroll position before  `render`  causes changes to it.

Note: the presence of getSnapshotBeforeUpdate prevents any of the deprecated
lifecycle events from running.

Returns: <code>any</code>

Arguments: 

`prevProps`: <code>Readonly&lt;Props&gt;</code>

`prevState`: <code>Readonly&lt;State&gt;</code>


### [render()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/ErrorBoundary.tsx#L34)




Returns: <code>undefined | "null" | string | number | boolean | ReactFragment | Element</code>

Arguments: none




### [setState(state, \[callback\])]()




Returns: <code>void</code>

Arguments: 

`state`: <code>"null" | State | function | Pick&lt;State, K&gt;</code>

`callback`: <code>function</code>


### [shouldComponentUpdate(nextProps, nextState, nextContext)]()


Called to determine whether the change in props and state should trigger a re-render.

 `Component`  always returns true.
 `PureComponent`  implements a shallow comparison on props and state and returns true if any
props or states have changed.

If false is returned,  `Component#render` ,  `componentWillUpdate` 
and  `componentDidUpdate`  will not be called.

Returns: <code>boolean</code>

Arguments: 

`nextProps`: <code>Readonly&lt;Props&gt;</code>

`nextState`: <code>Readonly&lt;State&gt;</code>

`nextContext`: <code>any</code>


### [getDerivedStateFromError(error)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/ErrorBoundary.tsx#L24)




Returns: <code>object</code>

Arguments: 

`error`: <code>Error</code>


