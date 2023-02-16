# Test

This is an unlisted page which may be useful for testing new docs functionality.

```tsx file=../src/demos/Test.tsx#L13-L37 showcase peers=2 controls=airplane setup=identity,space
const TaskList = ({ space }: { space: Space }) => {
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key === 'Enter' && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      await space.db.save(task);
    }
  };

  return (
    <div>
      <input ref={setInput} onKeyDown={handleKeyDown} />
      {tasks.map((task) => (
        <div key={task[id]}>
          <input type='checkbox' checked={!!task.completed} onChange={() => (task.completed = !task.completed)} />
          {task.title}
          <button onClick={() => space.db.delete(task)}>x</button>
        </div>
      ))}
    </div>
  );
};
```
