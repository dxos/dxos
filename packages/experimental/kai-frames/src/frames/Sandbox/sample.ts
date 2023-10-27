//
// Copyright 2023 DXOS.org
//

export const sampleCode = `// Example frame component.

import React, { useState } from 'react'
import { useQuery, useSpaces } from '@dxos/react-client'
import { Button } from '@dxos/react-ui';
import { Task } from '@dxos/kai-types'

export const TestFrame = () => {
  const [space] = useSpaces()
  const tasks = useQuery(space, Task.filter())
  const [value, setValue] = useState('');
  
  const handleCreate = () => {
    const task = new Task({ title: value });
    space.db.save(task);
  }

  return (
    <div className='w-full p-4'>
      <ul>
        {tasks.map(task => (
          <li key={task.id} className='p-1 hover:bg-blue-200'>{task.title}</li>
        ))}
      </ul>
      <div className='flex p-1 mt-4'>
        <input className='w-full border-b pr-4' value={value} onChange={ev => setValue(ev.target.value)} />
        <Button compact onClick={handleCreate}>Add</Button>
      </div>
    </div>
  )
}
`;
