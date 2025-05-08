<center>  
<img src="https://dxos.network/dxos-logotype-blue.png" style="height: 200px">
</center>

### A little less conversation, <br>A little more action
<br/>

<center>  
dmytro@dxos.org
</center>
  
<center>  
https://x.com/dxos_org
</center>

<center>  
https://github.com/dxos/dxos
</center>

---
<!-- 
.slide: data-background="#151515"
-->

| <img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/dxos-logotype.png?cache=3" style="height: 100px">  | <img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/composer-logotype.png?cache=3" style="height:  100px">  |
|---|---|
| _The Decentralized_<br> _Operating System_<br><br>- Privacy-preserving<br>local-first app framework.<br>- P2P Graph DB. | _An Open Source_<br>_Super App_<br><br>- An IDE for your data.<br>- Real time collaboration<br>with agent-driven workflows. | 

---

<!-- 
.slide: data-background="#000000"
-->

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/keyboard.png"/>
</center>

---
<!-- 
.slide: data-background="#151515"
-->

# The world before AGI

|                 |  |  |
|-----------------|--|--|
| GPT-3           | Paper           | June 2020      |
| ChatGPT 3       | GitHub Copilot  | November 2022  |
| ChatGPT 4       | RAG             | March 2023     |
| ChatGPT 4-turbo | Tools API       | November 2023  |
| Claude          | Artifacts       | June 2024      |
| Manus           | Agents          | February 2025  |
| Skynet          | T2              | Q4?            |

---
<!-- 
.slide: data-background="#EEE"
-->

# Chat

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/gpt-chat.png"/>
</center>

---
<!-- 
.slide: data-background="#EEE"
-->

# Chat → RAG

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/gpt-rag.png"/>
</center>

---
<!-- 
.slide: data-background="#EEE"
-->

# RAG → Tools

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/gpt-tools.png"/>
</center>

---
<!-- 
.slide: data-background="#EEE"
-->

# Tools → Artifacts

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/gpt-artifact.png"/>
</center>

---
<!-- 
.slide: data-background="#D95B3C"
-->

# Agents

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/agents-1.png?cache=1"/>
</center>

---
<!-- 
.slide: data-background="#D95B3C"
-->

# Agents

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/agents-2.png?cache=2"/>
</center>

---
<!-- 
ECHO
.slide: data-background="#96254F" data-background-opacity="0.5" data-background-image="https://dxos.network/bg-echo.svg" data-background-position="100% 50%"
-->

# ECHO-DB

_Eventually Consistent<br>Hierarchical Object Database_

- P2P Graph DB
- Realtime collaboration (CRDT)
- Schema, subscriptions, sync
- Federation (Spaces)
- HALO Access control (Credentials)
- Simple Reactive Typescript API

---
<!-- 
.slide: data-background="#151515"
-->

# Schema

```tsx
import { Schema } from 'effect'
import { ECHO } from '@dxos/client'
import { Contact } from './contact'

export const Task = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  created: Schema.String,
  assigned: ECHO.Ref(Contact)
}).pipe(ECHO.Object({
  typename: 'example.com/schema/Task',
  version: '0.1.0'
}))

export type Task = Schema.Type<typeof Task>
```

---
<!-- 
.slide: data-background="#151515"
-->

# Reactive API

```tsx
import { create, useSpace, useQuery } from '@dxos/react-client'
import { Task } from './task'

export const App = () => {
  const space = useSpace()
  const tasks = useQuery(space, Filter.schema(Task))
  const handlers = {
    onCreate: () => {
      space.db.add(create(Task, { created: Date.now() }))
    },
    onUpdate: (task: Task, title: string) => {
      task.title = title
    },
    onDelete: (task: Task) => {
      space.db.delete(task)
    } 
  }
  return <TaskList tasks={tasks} {...handlers} />
}
```

---
<!-- 
.slide: data-background-video="https://dxos.network/DXOS.mp4" data-background-video-loop="true"
-->

# DEMO

<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>

---
<!-- 
.slide: data-background="#EEE"
-->

# Edge Computing

<center>
<img src="https://pub-a497338ae2d34236b2cb010710733669.r2.dev/system-diagram.png"/>
</center>

---
<!-- 
.slide: data-background="#08754F"
-->

# Conductor

---
<!-- 
.slide: data-background="#151515"
-->

# GRAZIE MILLE

- dmytro@dxos.org
- https://x.com/dxos_org
- https://dxos.org/discord
- https://dxos.org/composer
- https://github.com/dxos/dxos
