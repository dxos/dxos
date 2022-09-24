# Class: ErrorBoundary

[@dxos/react-toolkit](../modules/dxos_react_toolkit.md).ErrorBoundary

Root-level error boundary.
NOTE: Must currently be a Component.
https://reactjs.org/docs/error-boundaries.html
https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes

## Hierarchy

- `Component`<`PropsWithChildren`<`ErrorBoundaryProps`\>, `ErrorBoundaryState`\>

  ↳ **`ErrorBoundary`**

## Table of contents

### Constructors

- [constructor](dxos_react_toolkit.ErrorBoundary.md#constructor)

### Properties

- [context](dxos_react_toolkit.ErrorBoundary.md#context)
- [props](dxos_react_toolkit.ErrorBoundary.md#props)
- [refs](dxos_react_toolkit.ErrorBoundary.md#refs)
- [state](dxos_react_toolkit.ErrorBoundary.md#state)
- [contextType](dxos_react_toolkit.ErrorBoundary.md#contexttype)
- [defaultProps](dxos_react_toolkit.ErrorBoundary.md#defaultprops)

### Methods

- [UNSAFE\_componentWillMount](dxos_react_toolkit.ErrorBoundary.md#unsafe_componentwillmount)
- [UNSAFE\_componentWillReceiveProps](dxos_react_toolkit.ErrorBoundary.md#unsafe_componentwillreceiveprops)
- [UNSAFE\_componentWillUpdate](dxos_react_toolkit.ErrorBoundary.md#unsafe_componentwillupdate)
- [componentDidCatch](dxos_react_toolkit.ErrorBoundary.md#componentdidcatch)
- [componentDidMount](dxos_react_toolkit.ErrorBoundary.md#componentdidmount)
- [componentDidUpdate](dxos_react_toolkit.ErrorBoundary.md#componentdidupdate)
- [componentWillMount](dxos_react_toolkit.ErrorBoundary.md#componentwillmount)
- [componentWillReceiveProps](dxos_react_toolkit.ErrorBoundary.md#componentwillreceiveprops)
- [componentWillUnmount](dxos_react_toolkit.ErrorBoundary.md#componentwillunmount)
- [componentWillUpdate](dxos_react_toolkit.ErrorBoundary.md#componentwillupdate)
- [forceUpdate](dxos_react_toolkit.ErrorBoundary.md#forceupdate)
- [getSnapshotBeforeUpdate](dxos_react_toolkit.ErrorBoundary.md#getsnapshotbeforeupdate)
- [render](dxos_react_toolkit.ErrorBoundary.md#render)
- [setState](dxos_react_toolkit.ErrorBoundary.md#setstate)
- [shouldComponentUpdate](dxos_react_toolkit.ErrorBoundary.md#shouldcomponentupdate)

## Constructors

### constructor

• **new ErrorBoundary**(`props`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `PropsWithChildren`<`ErrorBoundaryProps`\> \| `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |

#### Inherited from

Component<PropsWithChildren<ErrorBoundaryProps\>, ErrorBoundaryState\>.constructor

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:474

• **new ErrorBoundary**(`props`, `context`)

**`Deprecated`**

**`See`**

https://reactjs.org/docs/legacy-context.html

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `PropsWithChildren`<`ErrorBoundaryProps`\> |
| `context` | `any` |

#### Inherited from

Component<PropsWithChildren<ErrorBoundaryProps\>, ErrorBoundaryState\>.constructor

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:479

## Properties

### context

• **context**: `any`

If using the new style context, re-declare this in your class to be the
`React.ContextType` of your `static contextType`.
Should be used with type annotation or static contextType.

```ts
static contextType = MyContext
// For TS pre-3.7:
context!: React.ContextType<typeof MyContext>
// For TS 3.7 and above:
declare context: React.ContextType<typeof MyContext>
```

**`See`**

https://reactjs.org/docs/context.html

#### Inherited from

Component.context

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:472

___

### props

• `Readonly` **props**: `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> & `Readonly`<{ `children?`: `ReactNode`  }\>

#### Inherited from

Component.props

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:497

___

### refs

• **refs**: `Object`

**`Deprecated`**

https://reactjs.org/docs/refs-and-the-dom.html#legacy-api-string-refs

#### Index signature

▪ [key: `string`]: `ReactInstance`

#### Inherited from

Component.refs

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:503

___

### state

• **state**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `errors` | `never`[] |
| `fatal` | `boolean` |

#### Overrides

Component.state

#### Defined in

[packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx#L42)

___

### contextType

▪ `Static` `Optional` **contextType**: `Context`<`any`\>

If set, `this.context` will be set at runtime to the current value of the given Context.

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

**`See`**

https://reactjs.org/docs/context.html#classcontexttype

#### Inherited from

Component.contextType

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:454

___

### defaultProps

▪ `Static` **defaultProps**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `indicator` | (`__namedParameters`: [`ErrorIndicatorProps`](../interfaces/dxos_react_toolkit.ErrorIndicatorProps.md)) => ``null`` \| `Element` |
| `onError` | `undefined` |
| `onReload` | `undefined` |
| `onReset` | `undefined` |
| `view` | (`__namedParameters`: [`ErrorViewProps`](../interfaces/dxos_react_toolkit.ErrorViewProps.md)) => ``null`` \| `Element` |

#### Defined in

[packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx#L34)

## Methods

### UNSAFE\_componentWillMount

▸ `Optional` **UNSAFE_componentWillMount**(): `void`

Called immediately before mounting occurs, and before `Component#render`.
Avoid introducing any side-effects or subscriptions in this method.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

**`Deprecated`**

16.3, use componentDidMount or the constructor instead

**`See`**

 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state
 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path

#### Returns

`void`

#### Inherited from

Component.UNSAFE\_componentWillMount

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:710

___

### UNSAFE\_componentWillReceiveProps

▸ `Optional` **UNSAFE_componentWillReceiveProps**(`nextProps`, `nextContext`): `void`

Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling `Component#setState` generally does not trigger this method.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

**`Deprecated`**

16.3, use static getDerivedStateFromProps instead

**`See`**

 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props
 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path

#### Parameters

| Name | Type |
| :------ | :------ |
| `nextProps` | `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |
| `nextContext` | `any` |

#### Returns

`void`

#### Inherited from

Component.UNSAFE\_componentWillReceiveProps

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:742

___

### UNSAFE\_componentWillUpdate

▸ `Optional` **UNSAFE_componentWillUpdate**(`nextProps`, `nextState`, `nextContext`): `void`

Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call `Component#setState` here.

This method will not stop working in React 17.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

**`Deprecated`**

16.3, use getSnapshotBeforeUpdate instead

**`See`**

 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update
 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path

#### Parameters

| Name | Type |
| :------ | :------ |
| `nextProps` | `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |
| `nextState` | `Readonly`<`ErrorBoundaryState`\> |
| `nextContext` | `any` |

#### Returns

`void`

#### Inherited from

Component.UNSAFE\_componentWillUpdate

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:770

___

### componentDidCatch

▸ **componentDidCatch**(`err`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |

#### Returns

`void`

#### Overrides

Component.componentDidCatch

#### Defined in

[packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx:48](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx#L48)

___

### componentDidMount

▸ `Optional` **componentDidMount**(): `void`

Called immediately after a component is mounted. Setting state here will trigger re-rendering.

#### Returns

`void`

#### Inherited from

Component.componentDidMount

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:618

___

### componentDidUpdate

▸ `Optional` **componentDidUpdate**(`prevProps`, `prevState`, `snapshot?`): `void`

Called immediately after updating occurs. Not called for the initial render.

The snapshot is only present if getSnapshotBeforeUpdate is present and returns non-null.

#### Parameters

| Name | Type |
| :------ | :------ |
| `prevProps` | `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |
| `prevState` | `Readonly`<`ErrorBoundaryState`\> |
| `snapshot?` | `any` |

#### Returns

`void`

#### Inherited from

Component.componentDidUpdate

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:681

___

### componentWillMount

▸ `Optional` **componentWillMount**(): `void`

Called immediately before mounting occurs, and before `Component#render`.
Avoid introducing any side-effects or subscriptions in this method.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

**`Deprecated`**

16.3, use componentDidMount or the constructor instead; will stop working in React 17

**`See`**

 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#initializing-state
 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path

#### Returns

`void`

#### Inherited from

Component.componentWillMount

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:696

___

### componentWillReceiveProps

▸ `Optional` **componentWillReceiveProps**(`nextProps`, `nextContext`): `void`

Called when the component may be receiving new props.
React may call this even if props have not changed, so be sure to compare new and existing
props if you only want to handle changes.

Calling `Component#setState` generally does not trigger this method.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

**`Deprecated`**

16.3, use static getDerivedStateFromProps instead; will stop working in React 17

**`See`**

 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#updating-state-based-on-props
 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path

#### Parameters

| Name | Type |
| :------ | :------ |
| `nextProps` | `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |
| `nextContext` | `any` |

#### Returns

`void`

#### Inherited from

Component.componentWillReceiveProps

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:725

___

### componentWillUnmount

▸ `Optional` **componentWillUnmount**(): `void`

Called immediately before a component is destroyed. Perform any necessary cleanup in this method, such as
cancelled network requests, or cleaning up any DOM elements created in `componentDidMount`.

#### Returns

`void`

#### Inherited from

Component.componentWillUnmount

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:634

___

### componentWillUpdate

▸ `Optional` **componentWillUpdate**(`nextProps`, `nextState`, `nextContext`): `void`

Called immediately before rendering when new props or state is received. Not called for the initial render.

Note: You cannot call `Component#setState` here.

Note: the presence of getSnapshotBeforeUpdate or getDerivedStateFromProps
prevents this from being invoked.

**`Deprecated`**

16.3, use getSnapshotBeforeUpdate instead; will stop working in React 17

**`See`**

 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#reading-dom-properties-before-an-update
 - https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#gradual-migration-path

#### Parameters

| Name | Type |
| :------ | :------ |
| `nextProps` | `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |
| `nextState` | `Readonly`<`ErrorBoundaryState`\> |
| `nextContext` | `any` |

#### Returns

`void`

#### Inherited from

Component.componentWillUpdate

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:755

___

### forceUpdate

▸ **forceUpdate**(`callback?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback?` | () => `void` |

#### Returns

`void`

#### Inherited from

Component.forceUpdate

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:489

___

### getSnapshotBeforeUpdate

▸ `Optional` **getSnapshotBeforeUpdate**(`prevProps`, `prevState`): `any`

Runs before React applies the result of `render` to the document, and
returns an object to be given to componentDidUpdate. Useful for saving
things such as scroll position before `render` causes changes to it.

Note: the presence of getSnapshotBeforeUpdate prevents any of the deprecated
lifecycle events from running.

#### Parameters

| Name | Type |
| :------ | :------ |
| `prevProps` | `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |
| `prevState` | `Readonly`<`ErrorBoundaryState`\> |

#### Returns

`any`

#### Inherited from

Component.getSnapshotBeforeUpdate

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:675

___

### render

▸ **render**(): `Element`

#### Returns

`Element`

#### Overrides

Component.render

#### Defined in

[packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx:54](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/ErrorBoundary/ErrorBoundary.tsx#L54)

___

### setState

▸ **setState**<`K`\>(`state`, `callback?`): `void`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends keyof `ErrorBoundaryState` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `state` | ``null`` \| `ErrorBoundaryState` \| (`prevState`: `Readonly`<`ErrorBoundaryState`\>, `props`: `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\>) => ``null`` \| `ErrorBoundaryState` \| `Pick`<`ErrorBoundaryState`, `K`\> \| `Pick`<`ErrorBoundaryState`, `K`\> |
| `callback?` | () => `void` |

#### Returns

`void`

#### Inherited from

Component.setState

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:484

___

### shouldComponentUpdate

▸ `Optional` **shouldComponentUpdate**(`nextProps`, `nextState`, `nextContext`): `boolean`

Called to determine whether the change in props and state should trigger a re-render.

`Component` always returns true.
`PureComponent` implements a shallow comparison on props and state and returns true if any
props or states have changed.

If false is returned, `Component#render`, `componentWillUpdate`
and `componentDidUpdate` will not be called.

#### Parameters

| Name | Type |
| :------ | :------ |
| `nextProps` | `Readonly`<`PropsWithChildren`<`ErrorBoundaryProps`\>\> |
| `nextState` | `Readonly`<`ErrorBoundaryState`\> |
| `nextContext` | `any` |

#### Returns

`boolean`

#### Inherited from

Component.shouldComponentUpdate

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:629
