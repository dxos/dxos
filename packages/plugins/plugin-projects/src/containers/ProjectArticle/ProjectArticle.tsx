//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type Node, useActionRunner } from '@dxos/plugin-graph';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import {
  type ActionExecutor,
  type ActionGraphProps,
  Menu,
  MenuBuilder,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { ProjectOperation } from '#types';

// Pick the editable header fields from the Project schema rather than redeclaring them.
const HeaderValues = Type.getSchema(Project.Project).pipe(Schema.pick('name', 'description'));
type HeaderValues = Schema.Schema.Type<typeof HeaderValues>;

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project>;

/**
 * Article surface for a {@link Project}: one form-styled body (header fields, the owned instructions
 * sub-form, and sections listing linked routines and artifacts). `Form.Viewport` owns the scroll and
 * gutter so fields stay inset from the panel edges. Creating routines/artifacts here is milestone 2.
 */
export const ProjectArticle = ({ role, subject, attendableId }: ProjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { actions, onAction } = useToolbarActions(subject, attendableId);
  const [project, updateProject] = useObject(subject);
  const db = Obj.getDatabase(subject);
  // Resolve reactively: on a cold load (deep link) the owned ref's target is not yet in memory, and a
  // sync `.target` read would leave the section permanently missing. The sub-editor mutates the
  // instructions in place, so unwrap the snapshot back to the live entity.
  const [instructionsSnapshot] = useObject(project.instructions);
  const instructions = Obj.getReactiveOrUndefined(instructionsSnapshot);
  const [artifacts] = useObject(project.artifacts);

  // Read once per project identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<HeaderValues>>(
    () => ({ name: project.name, description: project.description }),
    [subject],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<HeaderValues>) => {
      updateProject((project) => {
        project.name = values.name;
        project.description = values.description;
      });
    },
    [updateProject],
  );

  if (!db) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...actions} attendableId={attendableId} onAction={onAction}>
          <Menu.Toolbar classNames='dx-document' />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Form.Root schema={HeaderValues} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
          <Form.Viewport scroll>
            <Form.Content>
              <Form.FieldSet />

              {instructions && <InstructionsEditor db={db} instructions={instructions} />}

              <Form.Section title={t('routines.label')}>
                <ObjectList label={t('routines.label')} refs={project.routines} />
              </Form.Section>

              <Form.Section title={t('artifacts.label')}>
                <ObjectList label={t('artifacts.label')} refs={artifacts?.objects ?? []} />
              </Form.Section>
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

ProjectArticle.displayName = 'ProjectArticle';

/**
 * The toolbar owns its create-chat button rather than relying on the graph action of the same name:
 * graph actions are keyed by node id, so a toolbar built only from them is empty whenever the attended
 * id is not the node the action hangs off. The graph action stays for the navtree row, and the splice
 * below still picks up contributions from other plugins.
 */
const useToolbarActions = (
  project: Project.Project,
  attendableId: string,
): { actions: ReturnType<typeof useMenuBuilder>; onAction: ActionExecutor } => {
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const { invokePromise } = useOperationInvoker();

  const actions = useMenuBuilder(
    (get): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'create-chat',
          {
            label: ['create-chat.label', { ns: meta.profile.key }],
            icon: 'ph--chat-text--regular',
            disposition: 'toolbar',
            testId: 'projectsPlugin.createChat',
          },
          () => void invokePromise(ProjectOperation.CreateChat, { project }),
        )
        .subgraph(graphActions(graph, get, attendableId, { filter: isToolbarAction }))
        .build(),
    [graph, attendableId, project, invokePromise],
  );

  const onAction: ActionExecutor = useCallback(
    (action) => {
      void runAction(action as Node.Action, { caller: meta.profile.key });
    },
    [runAction],
  );

  return { actions, onAction };
};

type ObjectListProps = {
  label: string;
  refs: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
};

/** Read-only list of resolved object references. */
const ObjectList = ({ label, refs }: ObjectListProps) => (
  <Listbox.Root>
    <Listbox.Viewport>
      <Listbox.Content aria-label={label}>
        {refs.map((objectRef) => (
          <ObjectRow key={objectRef.uri} objectRef={objectRef} />
        ))}
      </Listbox.Content>
    </Listbox.Viewport>
  </Listbox.Root>
);

type ObjectRowProps = {
  objectRef: Ref.Ref<Obj.Unknown>;
};

/** One object row; resolves the reference reactively for its label and is omitted while unresolved. */
const ObjectRow = ({ objectRef }: ObjectRowProps) => {
  const [object] = useObject(objectRef);
  if (!object) {
    return null;
  }

  return (
    <Listbox.Item id={object.id}>
      <span className='truncate'>{Obj.getLabel(object) ?? object.id}</span>
    </Listbox.Item>
  );
};
