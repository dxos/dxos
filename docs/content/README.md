---
home: true
title: Documentation
heroText: false
heroImage: /images/logotype/dxos-hero.svg
heroImageDark: /images/logotype/dxos-hero-white.svg
actions:
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

```tsx{41} file=../node_modules/@dxos/examples/src/examples/TaskList.tsx#L5-L56 showcase peers=2 controls=fork
import { X } from '@phosphor-icons/react';
import React, { KeyboardEventHandler, useState } from 'react';

import { TextInput, Button, Checkbox, InputRoot, Label } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';

import { Task } from '../proto';

const TaskList = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const space = useSpace(spaceKey);
  const tasks = useQuery(space, Task.filter());
  const [input, setInput] = useState<HTMLInputElement>();

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && space && input) {
      const task = new Task({ title: input.value });
      input.value = '';
      space.db.add(task);
    }
  };

  return (
    <div className='grow max-w-lg mbs-4 place-content-evenly'>
      <h2 className='mbe-2 font-bold'>{`Peer ${id + 1}`}</h2>
      <InputRoot>
        <Label srOnly>Create new item</Label>
        <TextInput
          classNames='mbe-2'
          placeholder='New item'
          ref={(e: HTMLInputElement) => setInput(e)}
          onKeyDown={handleKeyDown}
        />
      </InputRoot>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className='flex items-center gap-2 mbe-2 pl-3'>
            <InputRoot>
              <Label srOnly>Complete {task.title}</Label>
              <Checkbox checked={!!task.completed} onCheckedChange={() => (task.completed = !task.completed)} />
            </InputRoot>
            <div className='grow'>{task.title}</div>
            <Button variant='ghost' onClick={() => space?.db.remove(task)}>
              <X className={getSize(4)} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

The highlighted line above shows how easy it is to track state with ECHO.

Simply mutate objects received from ECHO as you would any regular JavaScript object, and the changes will propagate to all connected peers automatically. Read more about [ECHO](/guide/echo/), [mutations in TypeScript](/guide/typescript/mutations/), and [React](/guide/react/mutations/).
