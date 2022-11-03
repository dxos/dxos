---
title: Mutations
---

To create shared items on our Party, we just need to call `party.database.createItem` function sending some required information:

```jsx
import { useParty } from '@dxos/react-client';
import { ObjectModel } from '@dxos/object-model';

const EXAMPLE_TYPE = 'example.com/type/item';

const Component = ({ space_key }) => {
  const party = useParty(space_key);

  const handleCreateItem = async () => {
    await party.database.createItem({
      type: EXAMPLE_TYPE,
      model: ObjectModel,
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
