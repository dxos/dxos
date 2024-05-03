---
title: Mutations
---

To create shared items on our space, we just need to call `space.database.createItem` function sending some required information:

```jsx
import { usespace } from '@dxos/react-client';
import { DocumentModel } from '@dxos/document-model';

const EXAMPLE_TYPE = 'example.com/type/item';

const Component = ({ space_key }) => {
  const space = usespace(space_key);

  const handleCreateItem = async () => {
    await space.database.createItem({
      type: EXAMPLE_TYPE,
      model: DocumentModel,
      props: { title: 'My Example' },
    });
  };

  // ...
};
```

| Property | Description                                                 |
| -------- | ----------------------------------------------------------- |
| `type`   | Item's type, could be anything that helps you identify it.  |
| `model`  | TODO: definition of model.                                   |
| `props`  | Any information that you would like to attach to your item. |
