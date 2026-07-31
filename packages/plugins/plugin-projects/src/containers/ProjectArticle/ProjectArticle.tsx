//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { memo, useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import { SpaceOperation } from '@dxos/plugin-space';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Masonry } from '@dxos/react-ui-masonry';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { ObjectCard } from '#components';
import { meta } from '#meta';
import { ProjectOperation } from '#types';

// Pick the editable header fields from the Project schema rather than redeclaring them.
const HeaderValues = Type.getSchema(Project.Project).pipe(Schema.pick('name', 'description'));
type HeaderValues = Schema.Schema.Type<typeof HeaderValues>;

// The Context section edits only the instructions' standing context objects.
const CONTEXT_FIELDS: readonly string[] = ['objects'];

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project>;

/**
 * Article surface for a {@link Project}: one form-styled body (header fields, the owned instructions
 * sub-form, and card galleries of the linked routines and artifacts). `Form.Viewport` owns the scroll
 * and gutter so fields stay inset from the panel edges.
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

  // Deletes the object and splices it out of the artifacts collection, closing any open plank —
  // `RemoveObjects` does all three, given the collection as its target.
  const artifactsCollection = Obj.getReactiveOrUndefined(artifacts);
  const handleDeleteArtifact = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(SpaceOperation.RemoveObjects, { objects: [object], target: artifactsCollection });
    },
    [invokePromise, artifactsCollection],
  );

  // Routines are owned by the project but filed in no collection, so `RemoveObjects` needs no target;
  // the `routines` ref is spliced here since the cascade only follows parent edges.
  const handleDeleteRoutine = useCallback(
    (object: Obj.Unknown) => {
      updateProject((project) => {
        project.routines = project.routines.filter((routineRef) => routineRef.target?.id !== object.id);
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
          <Menu.Toolbar classNames='dx-document' />
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

                <Form.Section title={t('routines.label')}>
                  <ObjectGallery refs={project.routines} onOpen={handleOpen} onDelete={handleDeleteRoutine} />
                </Form.Section>

                <Form.Section title={t('artifacts.label')}>
                  <ObjectGallery refs={artifacts?.objects ?? []} onOpen={handleOpen} onDelete={handleDeleteArtifact} />
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
 * The toolbar's own actions. Deliberately not spliced from the app graph: toolbar and navtree
 * actions are expected to diverge as the toolbar grows, and the graph's create-chat action serves
 * the navtree row.
 */
const useToolbarActions = (project: Project.Project) => {
  const { invokePromise } = useOperationInvoker();
  // The handler resolves `Database.Service`, which only the space context supplies — without this
  // the invocation fails with ServiceNotAvailable.
  const spaceId = Obj.getDatabase(project)?.spaceId;

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
          () => void invokePromise(ProjectOperation.CreateChat, { project }, { spaceId }),
        )
        .action(
          'create-routine',
          {
            label: ['create-routine.label', { ns: meta.profile.key }],
            icon: 'ph--lightning--regular',
            disposition: 'toolbar',
            testId: 'projectsPlugin.createRoutine',
          },
          () => void invokePromise(ProjectOperation.CreateRoutine, { project }, { spaceId }),
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
 * A project's linked objects (routines or artifacts) as clickable cards. Unresolved refs are omitted
 * until their target loads.
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
