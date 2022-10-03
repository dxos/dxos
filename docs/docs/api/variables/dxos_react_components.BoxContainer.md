# Variable: BoxContainer

[@dxos/react-components](../modules/dxos_react_components.md).BoxContainer

 `Const` **BoxContainer**: `any`

Expandable container that support scrolling.
https://css-tricks.com/snippets/css/a-guide-to-flexbox
NOTE: Scrolling flexboxes requires that ancestors set overflow to hidden, which is set by default.

Example:
```
<FullScreen>
  <BoxContainer>
    <div>Fixed</div>
     <BoxContainer scrollX>
       <List />
     </BoxContainer>
  <BoxContainer>
</Fullscreen>
```

#### Defined in

[packages/sdk/react-components/src/BoxContainer.tsx:32](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/BoxContainer.tsx#L32)
