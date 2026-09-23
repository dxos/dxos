//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useOperation } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { SchemaAST } from '@dxos/effect';
import { Panel } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

// Picked from the Task schema rather than redeclared, so the article cannot drift from the type.
// v4 exposes `mapFields` only on a `Struct` and `Type.getSchema` erases to `Codec`, so the pick runs
// on the AST and the field types are re-attached here (the same shape `ProjectArticle` uses).
type TaskValues = Pick<Task.Task, 'title' | 'description' | 'status' | 'priority' | 'estimate'>;

const TaskValues = Schema.make<Schema.Codec<TaskValues, any>>(
  SchemaAST.pick(Type.getSchema(Task.Task).ast, ['title', 'description', 'status', 'priority', 'estimate']),
);

export type TaskArticleProps = AppSurface.ObjectArticleProps<Task.Task>;

/**
 * Article surface for a single {@link Task} — the detail a row opens, reusing the task plank as the
 * reader moves down a list (see `plugin-projects/docs/TASK-DETAIL.md`).
 *
 * Edits go through {@link TaskOperation.UpdateTask} rather than writing fields directly, so the
 * article shares the history-writing path with the list and with agents.
 */
export const TaskArticle = ({ role, subject: task }: TaskArticleProps) => {
  const spaceId = Obj.getDatabase(task)?.spaceId;
  // Subscribed, so a rename made in the list (or by an agent) reaches the read below.
  const [snapshot] = useObject(task);
  const current = snapshot ?? task;

  const update = useOperation(TaskOperation.UpdateTask, (props: Task.Edit) => ({ task: Ref.make(task), ...props }), {
    spaceId,
  });

  // Read once per task identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<TaskValues>>(
    () => ({
      title: current.title,
      description: current.description,
      status: current.status,
      priority: current.priority,
      estimate: current.estimate,
    }),
    [task],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<TaskValues>) => {
      update({
        title: values.title,
        // `null` clears an optional field; `undefined` would mean the edit does not mention it, so a
        // cleared field would silently keep its old value.
        description: values.description ?? null,
        status: values.status,
        priority: values.priority ?? null,
        estimate: values.estimate ?? null,
      });
    },
    [update],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <Form.Root schema={TaskValues} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
          <Form.Viewport scroll>
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

TaskArticle.displayName = 'TaskArticle';
