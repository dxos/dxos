# Class `ErrorBoundary`
> Declared in [`packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx`]()

Root-level error boundary.
NOTE: Must currently be a Component.
https://reactjs.org/docs/error-boundaries.html
https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes

## Constructors
```ts
new ErrorBoundary (props: PropsWithChildren<ErrorBoundaryProps> | Readonly<PropsWithChildren<ErrorBoundaryProps>>) => ErrorBoundary
```
```ts
new ErrorBoundary (props: PropsWithChildren<ErrorBoundaryProps>, context: any) => ErrorBoundary
```

## Properties
### `context: unknown`
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
### `props: Readonly<PropsWithChildren<ErrorBoundaryProps>>`
### `refs: object`
### `state: object`
### `contextType: Context<any>`
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
### `defaultProps: object`

## Functions
```ts
UNSAFE_componentWillMount () => void
```
Called immediately before mounting occurs, and before  `Component#render` .
Avoid introducing any side-effects or subscriptions in this method.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.
```ts
UNSAFE_componentWillReceiveProps (nextProps: Readonly<PropsWithChildren<ErrorBoundaryProps>>, nextContext: any) => void
```
Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling  `Component#setState`  generally does not trigger this method.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.
```ts
UNSAFE_componentWillUpdate (nextProps: Readonly<PropsWithChildren<ErrorBoundaryProps>>, nextState: Readonly<ErrorBoundaryState>, nextContext: any) => void
```
Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call  `Component#setState`  here.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.
```ts
componentDidCatch (err: Error) => void
```
```ts
componentDidMount () => void
```
Called immediately after a component is mounted. Setting state here will trigger re-rendering.
```ts
componentDidUpdate (prevProps: Readonly<PropsWithChildren<ErrorBoundaryProps>>, prevState: Readonly<ErrorBoundaryState>, snapshot: any) => void
```
Called immediately after updating occurs. Not called for the initial render.

The snapshot is only present if getSnapshotBeforeUpdate is present and returns non-null.
```ts
componentWillMount () => void
```
Called immediately before mounting occurs, and before  `Component#render` .
Avoid introducing any side-effects or subscriptions in this method.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.
```ts
componentWillReceiveProps (nextProps: Readonly<PropsWithChildren<ErrorBoundaryProps>>, nextContext: any) => void
```
Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling  `Component#setState`  generally does not trigger this method.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.
```ts
componentWillUnmount () => void
```
Called immediately before a component is destroyed. Perform any necessary cleanup in this method, such as
cancelled network requests, or cleaning up any DOM elements created in  `componentDidMount` .
```ts
componentWillUpdate (nextProps: Readonly<PropsWithChildren<ErrorBoundaryProps>>, nextState: Readonly<ErrorBoundaryState>, nextContext: any) => void
```
Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call  `Component#setState`  here.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.
```ts
forceUpdate (callback: function) => void
```
```ts
getSnapshotBeforeUpdate (prevProps: Readonly<PropsWithChildren<ErrorBoundaryProps>>, prevState: Readonly<ErrorBoundaryState>) => any
```
Runs before React applies the result of  `render`  to the document, and
returns an object to be given to componentDidUpdate. Useful for saving
things such as scroll position before  `render`  causes changes to it.

Note: the presence of getSnapshotBeforeUpdate prevents any of the deprecated
lifecycle events from running.
```ts
render () => Element
```
```ts
setState <K> (state: "null" | ErrorBoundaryState | function | Pick<ErrorBoundaryState, K>, callback: function) => void
```
```ts
shouldComponentUpdate (nextProps: Readonly<PropsWithChildren<ErrorBoundaryProps>>, nextState: Readonly<ErrorBoundaryState>, nextContext: any) => boolean
```
Called to determine whether the change in props and state should trigger a re-render.

 `Component`  always returns true.
 `PureComponent`  implements a shallow comparison on props and state and returns true if any
props or states have changed.

If false is returned,  `Component#render` ,  `componentWillUpdate` 
and  `componentDidUpdate`  will not be called.