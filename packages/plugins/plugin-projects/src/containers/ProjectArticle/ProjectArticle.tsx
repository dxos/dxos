//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { memo, useCallback, useMemo } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Chat } from '@dxos/assistant-toolkit';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { SchemaAST } from '@dxos/effect';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Flex, Icon, Panel, useTranslation } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { Masonry } from '@dxos/react-ui-masonry';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Milestone } from '@dxos/types';

import { ObjectCard } from '#components';
import { meta } from '#meta';

// Pick the editable header fields from the Project schema rather than redeclaring them. v4 exposes
// `mapFields` only on a `Struct`, and `Type.getSchema` erases to `Codec`, so the pick runs on the AST
// and the field types are re-attached here.
type HeaderValues = Pick<Project.Project, 'name' | 'description'>;
const HeaderValues = Schema.make<Schema.Codec<HeaderValues, any>>(
  SchemaAST.pick(Type.getSchema(Project.Project).ast, ['name', 'description']),
);

// The Context section edits only the instructions' standing context objects.
const CONTEXT_FIELDS: readonly string[] = ['objects'];

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project>;

/**
 * Article surface for a {@link Project}: one form-styled body (header fields, the owned instructions
 * sub-form, the task-set section, and a card gallery of the project's artifacts). `Form.Viewport`
 * owns the scroll and gutter so fields stay inset from the panel edges.
 */
export const ProjectArticle = ({ role, subject, attendableId }: ProjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const actions = useToolbarActions(subject);
  const [project, updateProject] = useObject(subject);
  const db = Obj.getDatabase(subject);
  // Resolve reactively: on a cold load (deep link) the owned ref's target is not yet in memory,
  // and a sync `.target` read would leave the section permanently missing.
  // The sub-editor mutates the instructions in place, so unwrap the snapshot back to the live entity.
  const [instructionsSnapshot] = useObject(project.instructions);
  const instructions = Obj.getReactiveOrUndefined(instructionsSnapshot);
  // The Tasks section embeds plugin-tasks' section surface for the linked TaskSet (never its
  // components — the boundary is surfaces/operations only).
  const [taskSetSnapshot] = useObject(project.taskSet);
  const taskSet = Obj.getReactiveOrUndefined(taskSetSnapshot);
  const milestoneRefs = taskSetSnapshot?.milestones ?? [];

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

  // Artifacts are listed on the project itself, not filed in a collection, so `RemoveObjects` gets
  // no target (it only accepts a `Collection`) and the ref is spliced out here.
  const handleDeleteArtifact = useCallback(
    (object: Obj.Unknown) => {
      updateProject((project) => {
        project.artifacts = project.artifacts.filter((artifactRef) => artifactRef.target?.id !== object.id);
      });
      void invokePromise(SpaceOperation.RemoveObjects, { objects: [object] });
    },
    [invokePromise, updateProject],
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
    <Menu.Root {...actions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar>
          <Menu.Toolbar classNames='dx-document'>
            <Menu.Items />
          </Menu.Toolbar>
        </Panel.Toolbar>
        <Panel.Content>
          <Form.Root schema={HeaderValues} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
            <Form.Viewport scroll>
              <Form.Content>
                <Form.FieldSet />

                {instructions && <InstructionsEditor db={db} instructions={instructions} />}

                {/* Standing context (inputs bound into every project session) — deliberately a
                    separate labeled section from Artifacts (outputs the project owns). */}
                {instructions && (
                  <Form.Section title={t('context.label')}>
                    <InstructionsEditor db={db} instructions={instructions} fields={CONTEXT_FIELDS} />
                  </Form.Section>
                )}

                {milestoneRefs.length > 0 && (
                  <Form.Section title={t('milestones.label')}>
                    <MilestoneList refs={milestoneRefs} />
                  </Form.Section>
                )}

                {taskSet && (
                  <Form.Section title={t('tasks.label')}>
                    <Surface.Surface type={AppSurface.Section} data={{ subject: taskSet, attendableId }} limit={1} />
                  </Form.Section>
                )}

                <Form.Section title={t('artifacts.label')}>
                  <ObjectGallery refs={project.artifacts} onOpen={handleOpen} onDelete={handleDeleteArtifact} />
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

/** Read-only: milestones are authored through the agent/MCP verbs, and store no status to render. */
const MilestoneList = ({ refs }: { refs: ReadonlyArray<Ref.Ref<Milestone.Milestone>> }) => (
  <Flex role='list' column gap='xs'>
    {refs.map((milestoneRef) => (
      <MilestoneRow key={milestoneRef.uri.toString()} milestoneRef={milestoneRef} />
    ))}
  </Flex>
);

/** One row, holding its own subscription so a rename re-renders just that row. */
const MilestoneRow = ({ milestoneRef }: { milestoneRef: Ref.Ref<Milestone.Milestone> }) => {
  const [milestone] = useObject(milestoneRef);
  if (!milestone) {
    return null;
  }

  return (
    <Flex role='listitem' gap='sm' align='center' classNames='min-w-0'>
      <Icon icon='ph--flag--regular' size={4} />
      <span className='truncate'>{milestone.name}</span>
      {milestone.targetDate && <span className='text-subdued shrink-0'>{milestone.targetDate}</span>}
    </Flex>
  );
};

/**
 * The toolbar's own actions. Deliberately not spliced from the app graph: toolbar and navtree
 * actions are expected to diverge as the toolbar grows, and the graph's create-chat action serves
 * the navtree row.
 */
const useToolbarActions = (project: Project.Project) => {
  const { invokePromise } = useOperationInvoker();
  // The handler resolves `Database.Service`, which only the space context supplies — without this
  // the invocation fails with ServiceNotAvailable.
  const spaceId = Obj.getDatabase(project)?.spaceId;

  // Persisted on click rather than on the first message, so the chat is in the navtree straight away;
  // the parent edge before the add is what files it under the project rather than the space root.
  const createChat = useCallback(async () => {
    if (!spaceId) {
      return;
    }

    const { data } = await invokePromise(AssistantOperation.CreateChat, {}, { spaceId });
    const chat = data?.object;
    if (!chat) {
      return;
    }

    Chat.linkCompanion({ chat, subject: project });
    await invokePromise(SpaceOperation.AddObject, { object: chat }, { spaceId });
    await invokePromise(AssistantOperation.SetCurrentChat, { companionTo: project, chat }, { spaceId });
  }, [invokePromise, project, spaceId]);

  return useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'create-chat',
          {
            label: ['create-chat.label', { ns: meta.profile.key }],
            icon: 'ph--chat-text--regular',
            disposition: 'toolbar',
            testId: 'projectsPlugin.createChat',
          },
          () => void createChat(),
        )
        // The growing gap pushes the routines button to the trailing edge: it opens a companion rather
        // than creating anything, so it reads as navigation, not a peer of the create actions.
        .separator()
        .action(
          'routines',
          {
            label: ['routines.label', { ns: meta.profile.key }],
            icon: 'ph--lightning--regular',
            disposition: 'toolbar',
            testId: 'projectsPlugin.routines',
          },
          () => void invokePromise(LayoutOperation.UpdateCompanion, { subject: Attention.linkedSegment('automation') }),
        )
        .build(),
    [project, invokePromise, spaceId],
  );
};

type ObjectTileData = { object: Obj.Unknown; onClick: () => void; onDelete: () => void };

type ObjectGalleryProps = {
  refs: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
  onOpen: (object: Obj.Unknown) => void;
  onDelete: (object: Obj.Unknown) => void;
};

/**
 * A project's linked objects (its artifacts) as clickable cards. Unresolved refs are omitted until
 * their target loads.
 */
const ObjectGallery = ({ refs, onOpen, onDelete }: ObjectGalleryProps) => {
  // Resolve reactively: on a cold load the targets are not yet in memory, and reading `.target`
  // synchronously would leave the gallery permanently empty. The card needs the live entity, so
  // unwrap each loaded snapshot rather than re-reading `.target` — the refs come off a snapshot of
  // the project, which carries no resolver, so `.target` is undefined there even once loaded.
  const loaded = useObjects(refs);
  const items = useMemo<ObjectTileData[]>(
    () =>
      loaded
        .map((snapshot) => Obj.getReactiveOrUndefined(snapshot))
        .filter((object): object is Obj.Unknown => !!object)
        .map((object) => ({ object, onClick: () => onOpen(object), onDelete: () => onDelete(object) })),
    [loaded, onOpen, onDelete],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    // No `Masonry.Content`: it renders a `ScrollArea.Root`, and `Form.Viewport` already scrolls this
    // surface. Nested, the inner scroll root shrink-wrapped to its scrollbar gutter, so the
    // viewport's `contentWidth > 0` gate suppressed every tile — the sections rendered their
    // headings and nothing else.
    <Masonry.Root Tile={ObjectTile} centered={false}>
      <Masonry.Viewport items={items} getId={(data) => Obj.getURI(data.object)} scroll={false} />
    </Masonry.Root>
  );
};

const ObjectTile = memo(({ data }: { data: ObjectTileData | undefined; index: number }) =>
  data ? <ObjectCard object={data.object} onClick={data.onClick} onDelete={data.onDelete} /> : null,
);

ObjectTile.displayName = 'ObjectTile';
