//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { URI } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Panel, ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Outline as OutlineType, Task, type TaskSet } from '@dxos/types';

import { Outline, type OutlineController } from '#components';
import { meta } from '#meta';

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
  taskSet: destination,
  toolbar = true,
}: OutlineArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = getSpace(outline);

  // Link the user navigated into; the back button clears it to return to the outline.
  const [selected, setSelected] = useState<URI.URI>();
  const ref = useMemo(
    () => (selected && space ? space.db.makeRef<Obj.Unknown>(selected) : undefined),
    [selected, space],
  );
  // The document is editable markdown and every object link renders as a chip, so the target is
  // whatever the user linked — only render the task form once it really is a task.
  const target = useResolveRef(ref);
  const task = target && Obj.instanceOf(Task.Task, target) ? target : undefined;

  const handleConvertToTask = useCallback(
    async (text: string) => {
      if (!space) {
        return undefined;
      }

      const task = destination
        ? OutlineType.addTask(destination, space.db, text)
        : await OutlineType.createTask(outline, space.db, text);
      return { label: task.title, url: Obj.getURI(task).toString() };
    },
    [outline, space, destination],
  );

  const handleSelectLink = useCallback((url: string) => setSelected(URI.make(url)), []);
  const handleBack = useCallback(() => setSelected(undefined), []);

  const outlineRef = useRef<OutlineController>(null);
  const handleConvertCurrent = useCallback(() => outlineRef.current?.convertToTask(), []);
  // An item that is already a link cannot be promoted again; the outline reports this as the caret moves.
  const [convertible, setConvertible] = useState(true);

  // Task titles are edited independently of the document, so the link text is reconciled from the
  // live objects rather than trusted as written. Membership is the set's `tasks` array, so
  // unrelated tasks in the space are dropped before the map is built.
  // The set the links point into: the embedder's when one was supplied, else the outline's own.
  const taskSet = destination ?? outline.taskSet?.target;
  const tasks = useQuery(space?.db, taskSet ? Filter.type(Task.Task) : Filter.nothing());
  // `useQuery` re-emits only when result membership changes, never on a member's property change,
  // so renames are observed by subscribing to each task; the bump rebuilds the resolver, whose new
  // identity re-runs the editor's label sync.
  const [tick, bump] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const unsubscribes = tasks.map((task) => Obj.subscribe(task, bump));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [tasks]);
  const resolveLinkLabel = useMemo(() => {
    const members = new Set(taskSet?.tasks.map((ref) => ref.target?.id));
    const labels = new Map(
      tasks.filter((task) => members.has(task.id)).map((task) => [Obj.getURI(task).toString(), task.title]),
    );
    return (url: string) => labels.get(url);
  }, [tasks, taskSet, tick]);

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

  const outlineActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'convert-to-task',
          {
            label: t('convert-to-task.menu'),
            icon: 'ph--check-circle--regular',
            disposition: 'toolbar',
            disabled: !convertible,
          },
          handleConvertCurrent,
        )
        .build(),
    [t, handleConvertCurrent, convertible],
  );

  if (task) {
    return (
      <Menu.Root {...taskActions} attendableId={attendableId}>
        <Panel.Root role={role}>
          <Panel.Toolbar>
            <Menu.Toolbar classNames='dx-document'>
              <Menu.Items />
            </Menu.Toolbar>
          </Panel.Toolbar>
          <Panel.Content>
            <TaskForm task={task} classNames='dx-document' />
          </Panel.Content>
        </Panel.Root>
      </Menu.Root>
    );
  }

  if (!outline.content.target) {
    return null;
  }

  return (
    <Outline.Root
      ref={outlineRef}
      id={outline.content.target.id}
      text={outline.content.target}
      onConvertToTask={space ? handleConvertToTask : undefined}
      onConvertibleChange={setConvertible}
      onSelectLink={handleSelectLink}
      resolveLinkLabel={resolveLinkLabel}
    >
      <Menu.Root {...outlineActions} attendableId={attendableId}>
        <Panel.Root role={role}>
          {toolbar && (
            <Panel.Toolbar>
              <Menu.Toolbar classNames='dx-document'>
                <Menu.Items />
              </Menu.Toolbar>
            </Panel.Toolbar>
          )}
          <Panel.Content asChild>
            <Outline.Content classNames='dx-document' />
          </Panel.Content>
        </Panel.Root>
      </Menu.Root>
    </Outline.Root>
  );
};

OutlineArticle.displayName = 'OutlineArticle';

const TaskForm = ({ classNames, task }: ThemedClassName<{ task: Task.Task }>) => {
  const schema = useMemo(() => omitId(Type.getSchema(Task.Task)), []);

  const handleSave = useCallback(
    (values: Record<string, unknown>, { changed }: { changed: Record<string, boolean> }) => {
      Obj.update(task, () => {
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
      <Form.Viewport classNames={classNames} scroll>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
