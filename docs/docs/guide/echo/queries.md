---
position: 2
label: Queries
---
# Querying data

```tsx
import { useParty, useSelection } from '@dxos/react-client';

export const List = ({ key }) => {
  const party = useParty(key);
  const items = useSelection(party.select({ type: 'task' }));

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.model.get('name')}</li>
      ))}
    </ul>
  );
};
```