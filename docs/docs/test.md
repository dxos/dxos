# Test

This is an unlisted page which may be useful for testing new docs functionality.

```tsx file=../src/demos/TaskList.tsx#L13-L37 showcase peers=2 controls=airplane,fork setup=identity,space
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key === 'Enter' && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      await space.db.add(task);
    }
  };

  return (
    <div>
      <input ref={(e: HTMLInputElement) => setInput(e)} onKeyDown={handleKeyDown} />
      {tasks.map((task) => (
        <div key={task.id}>
          <input type='checkbox' checked={!!task.completed} onChange={() => (task.completed = !task.completed)} />
          {task.title}
          <button onClick={() => space.db.remove(task)}>x</button>
        </div>
      ))}
    </div>
  );
};

```
