//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { memo, useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { type Node, useActionRunner } from '@dxos/plugin-graph';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';
import {
  type ActionExecutor,
  type ActionGraphProps,
  Menu,
  MenuBuilder,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';

import { ArtifactCard } from '#components';
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
  // Resolve reactively: on a cold load (deep link) the owned ref's target is not yet in memory,
  // and a sync `.target` read would leave the section permanently missing.
  // The sub-editor mutates the instructions in place, so unwrap the snapshot back to the live entity.
  const [instructionsSnapshot] = useObject(project.instructions);
  const instructions = Obj.getReactiveOrUndefined(instructionsSnapshot);
  const [artifacts] = useObject(project.artifacts);

  // Read once per project identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<HeaderValues>>(
    () => ({ name: project.name, description: project.description }),
    [subject],
  );

  const { invokePromise } = useOperationInvoker();
  const handleOpen = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(LayoutOperation.Open, {
        subject: [GraphPath.getObjectPathFromObject(object)],
        pivotId: attendableId,
        navigation: 'immediate',
      });
    },
    [invokePromise, attendableId],
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
    // `Menu.Root` wraps the panel rather than sitting inside the toolbar: `ToolbarMenu` disables itself
    // unless the menu scope's `attendableId` has attention, so the scope has to span the surface that
    // receives attention, not just the toolbar row.
    <Menu.Root {...actions} attendableId={attendableId} onAction={onAction}>
      <Panel.Root role={role}>
        <Panel.Toolbar>
          <Menu.Toolbar classNames='dx-document' />
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
                  <ArtifactGallery refs={artifacts?.objects ?? []} onOpen={handleOpen} />
                </Form.Section>
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
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
  // The handler resolves `Database.Service`, which only the space context supplies — without this
  // the invocation fails with ServiceNotAvailable.
  const spaceId = Obj.getDatabase(project)?.spaceId;

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
          () => void invokePromise(ProjectOperation.CreateChat, { project }, { spaceId }),
        )
        .subgraph(graphActions(graph, get, attendableId, { filter: isToolbarAction }))
        .build(),
    [graph, attendableId, project, invokePromise, spaceId],
  );

  const onAction: ActionExecutor = useCallback(
    (action) => {
      void runAction(action as Node.Action, { caller: meta.profile.key });
    },
    [runAction],
  );

  return { actions, onAction };
};

type ArtifactTileData = { object: Obj.Unknown; onClick: () => void };

type ArtifactGalleryProps = {
  refs: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
  onOpen: (object: Obj.Unknown) => void;
};

/** A project's artifacts as clickable cards. Unresolved refs are omitted until their target loads. */
const ArtifactGallery = ({ refs, onOpen }: ArtifactGalleryProps) => {
  // Resolve reactively: on a cold load the targets are not yet in memory, and reading `.target`
  // synchronously would leave the gallery permanently empty.
  // `useObjects` is the resolution trigger; the live entities are re-read from `.target` because the
  // card needs the object, not a snapshot.
  const loaded = useObjects(refs);
  const items = useMemo<ArtifactTileData[]>(
    () =>
      refs
        .map((ref) => ref.target)
        .filter((object): object is Obj.Unknown => !!object)
        .map((object) => ({ object, onClick: () => onOpen(object) })),
    [refs, loaded, onOpen],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Masonry.Root Tile={ArtifactTile}>
      <Masonry.Content>
        <Masonry.Viewport items={items} getId={(data) => Obj.getURI(data.object)} />
      </Masonry.Content>
    </Masonry.Root>
  );
};

const ArtifactTile = memo(({ data }: { data: ArtifactTileData | undefined; index: number }) =>
  data ? <ArtifactCard object={data.object} onClick={data.onClick} /> : null,
);

ArtifactTile.displayName = 'ArtifactTile';

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
