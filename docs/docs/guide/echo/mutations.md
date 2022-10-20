---
position: 3
label: Mutations
---
# Mutating data

```tsx
import { useParty } from '@dxos/react-client';

export const List = ({ key }) => {
  const party = useParty(key);
  const textRef = useRef();

  const handleCreate = async () => {
    party.database.createItem({
      type: 'task',
      properties: {
        title: textRef.current.value
      }
    });
  };

  return (
    <div>
      <input ref={textRef} type='text' />
      <button onClick={handleCreate}>New Task</button>
    </div>
  );
}
```