---
home: true
title: Documentation
heroImage: /images/logotype/dxos-hero.svg
heroImageDark: /images/logotype/dxos-hero-white.svg
actions:
  - text: Learn more
    link: /guide/
    type: secondary
  - text: Get started
    link: /guide/getting-started
    type: primary
  - text: Join Discord
    link: https://discord.gg/eXVfryv3sW
    type: discord
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

This demonstrates how two peers would synchronize over ECHO (The Eventually Consistent Hierarhical Object store), a peer-to-peer graph database written in TypeScript. 

Type in the boxes below to create new list items and experiment with the replication toggle to see how clients reconcile when returning from offline mode. [Learn more about ECHO](/guide/).

```tsx file=../src/stories/react/examples/TaskList.tsx#L5-L48 showcase peers=2 controls=fork
import React, { KeyboardEventHandler, useState } from 'react';

import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';

import { Task } from '../../proto';

const TaskList = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const space = useSpace(spaceKey);
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      space?.db.add(task);
    }
  };

  const inputId = `createTaskInput--${id}`;

  return (
    <div className='task-list'>
      <p role='heading'>{`Peer ${id + 1}`}</p>
      <input
        aria-label='Create new item'
        placeholder='New item'
        id={inputId}
        ref={(e: HTMLInputElement) => setInput(e)}
        onKeyDown={handleKeyDown}
      />
      <div role='list'>
        {tasks.map((task) => (
          <div role='listitem' key={task.id}>
            <input type='checkbox' checked={!!task.completed} onChange={() => (task.completed = !task.completed)} />
            <p>{task.title}</p>
            <button onClick={() => space?.db.remove(task)}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

The highlighted line above shows how easy it is to track state with ECHO. 

Simply mutate objects received from ECHO as you would any regular JavaScript object, and the changes will propagate to all connected peers automatically. Read more about [ECHO](/guide/echo/), [mutations in TypeScript](/guide/typescript/mutations/), and [react](/guide/react/mutations/).