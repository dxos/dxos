//
// Copyright 2026 DXOS.org
//

import { Task } from '@fixture/pkg-a';

import { useObject } from '@dxos/echo-react';

export interface TaskCardProps {
  task: Task.Task;
}

/**
 * Renders a Task — fixture React component exercising the useObject pattern.
 */
export const TaskCard = ({ task: taskProp }: TaskCardProps) => {
  const [task, update] = useObject(taskProp);
  if (!task) {
    return null;
  }

  return (
    <article>
      <h3>{task.title}</h3>
      {task.description ? <p>{task.description}</p> : null}
      <label>
        <input
          type='checkbox'
          checked={task.done}
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
