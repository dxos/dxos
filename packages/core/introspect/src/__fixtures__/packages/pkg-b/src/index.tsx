//
// Copyright 2026 DXOS.org
//

import { type FC } from 'react';

import { useObject } from '@dxos/echo-react';

import { type Task } from '@fixture/pkg-a';

export interface TaskCardProps {
  task: Task;
}

/**
 * Renders a Task — fixture React component exercising the useObject pattern.
 */
export const TaskCard: FC<TaskCardProps> = ({ task }) => {
  const [snapshot, update] = useObject(task);
  if (!snapshot) {
    return null;
  }
  return (
    <article>
      <h3>{snapshot.title}</h3>
      {snapshot.description ? <p>{snapshot.description}</p> : null}
      <label>
        <input
          type='checkbox'
          checked={snapshot.done}
          onChange={(event) =>
            update((draft) => {
              draft.done = event.target.checked;
            })
          }
        />
        done
      </label>
    </article>
  );
};
