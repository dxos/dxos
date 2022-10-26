# Function `useSelection`
> Declared in [`packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts:21`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts#L21)




### useSelection
```ts
<T> (selection: Selection<T, void> | SelectionResult<T, any> | Falsy, deps: readonly any[]) => undefined | T[]
```
Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result,
apart from changes in ECHO database itself, must be passed to deps array
for updates to work correctly.