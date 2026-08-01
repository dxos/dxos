//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { URI } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Panel, ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Task } from '@dxos/types';

import { Outline, type OutlineController } from '#components';
import { meta } from '#meta';
import { Outline as OutlineType } from '#types';

export type OutlineArticleProps = AppSurface.ObjectArticleProps<OutlineType.Outline>;

export const OutlineArticle = ({ role, attendableId, subject: outline }: OutlineArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = getSpace(outline);

  // Link the user navigated into; the back button clears it to return to the outline.
  const [selected, setSelected] = useState<URI.URI>();
  const ref = useMemo(() => (selected && space ? space.db.makeRef<Task.Task>(selected) : undefined), [selected, space]);
  const task = useResolveRef(ref);

  const handleConvertToTask = useCallback(
    async (text: string) => {
      if (!space) {
        return undefined;
      }

      const task = await OutlineType.createTask(outline, space.db, text);
      return { label: task.title, url: Obj.getURI(task).toString() };
    },
    [outline, space],
  );

  const handleSelectLink = useCallback((url: string) => setSelected(URI.make(url)), []);
  const handleBack = useCallback(() => setSelected(undefined), []);

  const outlineRef = useRef<OutlineController>(null);
  const handleConvertCurrent = useCallback(() => outlineRef.current?.convertToTask(), []);

  // Task titles are edited independently of the document, so the link text is reconciled from the
  // live objects rather than trusted as written.
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const resolveLinkLabel = useMemo(() => {
    const labels = new Map(tasks.map((task) => [Obj.getURI(task).toString(), task.title]));
    return (url: string) => labels.get(url);
  }, [tasks]);

  const taskActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action('back', { label: t('back.label'), icon: 'ph--arrow-left--regular', disposition: 'toolbar' }, handleBack)
        .build(),
    [t, handleBack],
  );

  const outlineActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'convert-to-task',
          { label: t('convert-to-task.menu'), icon: 'ph--check-circle--regular', disposition: 'toolbar' },
          handleConvertCurrent,
        )
        .build(),
    [t, handleConvertCurrent],
  );

  if (task) {
    return (
      <Menu.Root {...taskActions} attendableId={attendableId}>
        <Panel.Root role={role}>
          <Panel.Toolbar>
            <Menu.Toolbar classNames='dx-document' />
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
      onSelectLink={handleSelectLink}
      resolveLinkLabel={resolveLinkLabel}
    >
      <Menu.Root {...outlineActions} attendableId={attendableId}>
        <Panel.Root role={role}>
          <Panel.Toolbar>
            <Menu.Toolbar classNames='dx-document' />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Outline.Content classNames='dx-document border' />
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
