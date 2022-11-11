---
position: 2
label: Queries
---
# Querying data

```tsx
import { usespace, useSelection } from '@dxos/react-client';

export const List = ({ key }) => {
  const space = usespace(key);
  const items = useSelection(space.select({ type: 'task' }));

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.model.get('name')}</li>
      ))}
    </ul>
  );
};
```
