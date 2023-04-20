---
home: true
title: Documentation
heroImage: /images/logotype/dxos-hero.svg
heroImageDark: /images/logotype/dxos-hero-white.svg
actions:
  - text: Get started
    link: /guide/getting-started
    type: primary
  - text: Learn more
    link: /guide/
    type: secondary
features:
  - title: 'ECHO Database'
    details: Peer-to-peer data synchronization for real time and offline-first applications.
  - title: 'HALO Identity'
    details: Private, secure, and simple decentralized identity and verifiable credentials.
  - title: 'MESH Networking'
    details: Resilient snd secure peer-to-peer networks, peer discovery, NAT traversal.
  - title: 'KUBE Network'
    details: Peer-to-peer infrastructure that supports the operation of the DXOS network.
  - title: 'Devtools'
    details: Command line and browser tools to create and publish applications, and manage KUBE network infrastructure.
  - title: 'Apps and Components'
    details: PWA project templates and React UI components.
footer: MIT Licensed | Copyright © DXOS.org
---

## ECHO in Action

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
