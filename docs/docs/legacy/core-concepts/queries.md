---
title: Queries
---

In order to fetch information from the space, we need to make use of `useSelection` hook from `@dxos/react-client` and `space.database.select` to set our filtering criteria:

```jsx
import { usespace, useSelection } from '@dxos/react-client';

const Component = () => {
  const space = usespace(space_key);

  const items = useSelection(
    space.database.select(
      (s) => s.filter({ type: EXAMPLE_TYPE }).filter((item) => !item.model.getProperty('deleted')).items
    ),
    [space_key]
  );

  // ...
};
```
