## React Framework

This package has all the UI Components.
There are 2 types of components:

- The ones that interacts with the core dependencies from DXOS.
- Stateless components

The UI components are built on top of Material UI framework.


### Storybooks

Here are some important items you need to be aware of:

- Every component must have their own storybook.
- If a component has more than one state we should be able to replicate it on Storybooks as well.
- Components needs to be kebab-cased for stores, example: 
```
TestComponent.tsx -> test-component.stories.tsx
```
