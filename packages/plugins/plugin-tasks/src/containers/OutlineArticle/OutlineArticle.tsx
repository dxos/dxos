//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Type } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { URI } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { Form, omitId } from '@dxos/react-ui-form';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Show from '@dxos/react-ui/Show';
import { Outline as OutlineType, Task, TaskSet } from '@dxos/types';

import { Outline, type OutlineController } from '#components';
import { meta } from '#meta';

import { useMarkdownExtensions } from '../../hooks/index.ts';

export type OutlineArticleProps = AppSurface.ObjectArticleProps<OutlineType.Outline> & {
  /**
   * Where promoted items are filed, when the outline is embedded in an object that owns a ledger of
   * its own (a project's inline outline). Defaults to the outline's own set.
   */
  taskSet?: TaskSet.TaskSet;
  /**
   * Whether to render the outline's own toolbar. Off when embedded: the host surface owns the
   * toolbar, and a second one inside its section reads as a nested editor.
   */
  toolbar?: boolean;
};

export const OutlineArticle = ({
  role,
  attendableId,
  subject: outline,
  taskSet,
  toolbar = true,
}: OutlineArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const db = Obj.getDatabase(outline);

  // Link the user navigated into; the back button clears it to return to the outline.
  const [selected, setSelected] = useState<URI.URI>();
  const ref = useMemo(() => (selected && db ? db.makeRef<Obj.Unknown>(selected) : undefined), [selected, db]);
  // The document is editable markdown and every object link renders as a chip, so the target is
  // whatever the user linked — only render the task form once it really is a task.
  const target = useResolveRef(ref);
  const task = target && Obj.instanceOf(Task.Task, target) ? target : undefined;

  // Promotion needs somewhere to file: an outline owns no task set, so it is the embedder that
  // supplies one. Without it the affordance is withheld rather than offered and then failing.
  const handleConvertToTask = useCallback(
    async (text: string) => {
      if (!db || !taskSet) {
        return undefined;
      }

      const task = TaskSet.addTask(db, taskSet, text);
      return {
        label: task.title,
        url: Obj.getURI(task).toString(),
      };
    },
    [db, taskSet],
  );

  const handleSelectLink = useCallback((url: string) => setSelected(URI.make(url)), []);
  const handleBack = useCallback(() => setSelected(undefined), []);

  const extensions = useMarkdownExtensions(outline);

  // Reactive: on a cold load (or a story that seeds during client init) the content ref's target
  // is not yet in memory, and a `.target` read would leave the editor permanently unmounted.
  const text = useResolveRef(outline.content);

  const outlineRef = useRef<OutlineController>(null);
  const handleConvertCurrent = useCallback(() => outlineRef.current?.convertToTask(), []);

  // Membership is the ECHO parent edge; transitive `childOf` also catches legacy sub-tasks still
  // parented to their parent task.
  const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)) : Filter.nothing());
  // `useQuery` re-emits only when result membership changes, never on a member's property change,
  // so renames are observed by subscribing to each task; the bump rebuilds the resolver, whose new
  // identity re-runs the editor's label sync.
  const [tick, bump] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const unsubscribes = tasks.map((task) => Obj.subscribe(task, bump));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [tasks]);

  // An item that is already a link cannot be promoted again; the outline reports this as the caret moves.
  const [convertible, setConvertible] = useState(true);

  const resolveLinkLabel = useMemo(() => {
    const labels = new Map(tasks.map((task) => [Obj.getURI(task).toString(), task.title]));
    return (url: string) => labels.get(url);
  }, [tasks, tick]);

  const taskActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'back',
          {
            label: t('back.label'),
            icon: 'ph--arrow-left--regular',
            disposition: 'toolbar',
          },
          handleBack,
        )
        .build(),
    [t, handleBack],
  );

  const outlineActions = useMenuBuilder((): ActionGraphProps => {
    const builder = MenuBuilder.make();
    // No destination set means no promotion at all, so the button is absent rather than dead.
    if (taskSet) {
      builder.action(
        'convert-to-task',
        {
          label: t('convert-to-task.menu'),
          icon: 'ph--check-circle--regular',
          disposition: 'toolbar',
          disabled: !convertible,
        },
        handleConvertCurrent,
      );
    }
    return builder.build();
  }, [t, handleConvertCurrent, taskSet, convertible]);

  if (task) {
    return (
      <Panel.Root role={role}>
        <Panel.Header>
          <ActionToolbar {...taskActions} attendableId={attendableId} classNames='dx-document' />
        </Panel.Header>
        <Panel.Body>
          <TaskForm task={task} />
        </Panel.Body>
      </Panel.Root>
    );
  }

  return (
    <Show.Show when={text}>
      {(text) => (
        <Outline.Root
          ref={outlineRef}
          id={text.id}
          text={text}
          onConvertToTask={taskSet ? handleConvertToTask : undefined}
          onConvertibleChange={setConvertible}
          onSelectLink={handleSelectLink}
          resolveLinkLabel={resolveLinkLabel}
          extensions={extensions}
        >
          <Panel.Root role={role}>
            <Show.Show when={toolbar}>
              <Panel.Header>
                <ActionToolbar {...outlineActions} attendableId={attendableId} classNames='dx-document' />
              </Panel.Header>
            </Show.Show>
            <Panel.Body asChild>
              <Outline.Content classNames='dx-document' />
            </Panel.Body>
          </Panel.Root>
        </Outline.Root>
      )}
    </Show.Show>
  );
};

OutlineArticle.displayName = 'OutlineArticle';

const TaskForm = ({ task }: { task: Task.Task }) => {
  const schema = useMemo(() => omitId(Type.getSchema(Task.Task)), []);

  const handleSave = useCallback(
    (values: Record<string, unknown>, { changed }: { changed: Record<string, boolean> }) => {
      Obj.update(task, (task) => {
        for (const path of Object.keys(changed).filter((path) => changed[path])) {
          if (SchemaEx.isJsonPath(path)) {
            Obj.setValue(task, SchemaEx.splitJsonPath(path), values[path]);
          }
        }
      });
    },
    [task],
  );

  return (
    <Form.Root schema={schema} values={task} autoSave onSave={handleSave}>
      <Form.Viewport scroll width='document'>
        <Form.Content>
          <Form.Fields />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
