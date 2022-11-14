---
position: 3
label: Mutations
---
# Mutating data

```tsx
import { usespace } from '@dxos/react-client';

export const List = ({ key }) => {
  const space = usespace(key);
  const textRef = useRef();

  const handleCreate = async () => {
    space.database.createItem({
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
