---
title: Queries
---

In order to fetch information from the party, we need to make use of `useSelection` hook from `@dxos/react-client` and `party.database.select` to set our filtering criteria:

```jsx
import { useParty, useSelection } from '@dxos/react-client';

const Component = () => {
  const party = useParty(space_key);

  const items = useSelection(
    party.database.select(
      (s) => s.filter({ type: EXAMPLE_TYPE }).filter((item) => !item.model.getProperty('deleted')).items
    ),
    [space_key]
  );

  // ...
};
```
