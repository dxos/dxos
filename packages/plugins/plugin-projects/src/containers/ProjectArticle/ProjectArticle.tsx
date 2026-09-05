//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { SchemaAST } from '@dxos/effect';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Flex, Icon, Panel, Tabs, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { Masonry } from '@dxos/react-ui-masonry';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { buildTaskForest, flattenVisibleTasks } from '@dxos/react-ui-task';
import { type Milestone, Task, type TaskSet } from '@dxos/types';

import { ObjectCard } from '#components';
import { meta } from '#meta';
import { ProjectOperation } from '#types';

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

/** Overview is everything the project owns; Tasks gives the ledger the whole panel. */
type Tab = 'overview' | 'tasks';

/**
 * Article surface for a {@link Project}: one form-styled body (header fields, the owned instructions
 * sub-form, the task-set section, and a card gallery of the project's artifacts). `Form.Viewport`
 * owns the scroll and gutter so fields stay inset from the panel edges.
 */
export const ProjectArticle = ({ role, subject, attendableId }: ProjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [tab, setTab] = useState<Tab>('overview');
  const { invokePromise } = useOperationInvoker();
  const [project, updateProject] = useObject(subject);
  const db = Obj.getDatabase(subject);
  // Resolve reactively: on a cold load (deep link) the owned ref's target is not yet in memory,
  // and a sync `.target` read would leave the section permanently missing. `useResolveRef` tracks
  // loading without tracking mutations — the sub-editors and section surfaces subscribe themselves,
  // so an edit inside instructions/outline/tasks re-renders those, not this article.
  const instructions = useResolveRef(project.instructions);
  // The Tasks section embeds plugin-tasks' section surface for the linked TaskSet (never its
  // components — the boundary is surfaces/operations only).
  const taskSet = useResolveRef(project.taskSet);
  // The project's scratch outline (created lazily by its chats).
  const outline = useResolveRef(project.outline);
  // Membership only: fires when a milestone is added or removed, not on milestone edits.
  const [milestoneRefs = []] = useObject(taskSet, 'milestones');
  // The rows the embedded `TaskSetArticle` has checked; the toolbar arms its delegate action on them.
  const { checkedTasks, clearChecked } = useCheckedTasks(taskSet);

  const actions = useToolbarActions({
    project: subject,
    checkedTasks,
    onAddArtifact: () => void handleAddArtifact(),
    onDelegated: clearChecked,
  });

  // Read once per project identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<HeaderValues>>(
    () => ({ name: project.name, description: project.description }),
    [subject],
  );

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

  // The create dialog places the object in the space; the ref array is what makes it this project's,
  // so the link is written here. A dismissed dialog returns nothing and leaves the project untouched.
  const handleAddArtifact = useCallback(async () => {
    if (!db) {
      return;
    }

    const { data: ref } = await invokePromise(SpaceOperation.OpenObjectForm, {
      target: db,
      targetNodeId: attendableId,
      navigable: false,
    });
    if (!ref) {
      return;
    }

    updateProject((project) => {
      project.artifacts = [...project.artifacts, ref];
    });
  }, [db, attendableId, invokePromise, updateProject]);

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
    <Menu.Root {...actions} attendableId={attendableId}>
      <Tabs.Root asChild orientation='horizontal' value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <Panel.Root role={role}>
          <Panel.Toolbar>
            <Menu.Toolbar>
              <Tabs.Tablist classNames='w-auto p-0'>
                <Tabs.Button value='overview' data-testid='projectsPlugin.tab.overview'>
                  {t('overview.label')}
                </Tabs.Button>
                <Tabs.Button value='tasks' data-testid='projectsPlugin.tab.tasks'>
                  {t('tasks.label')}
                </Tabs.Button>
              </Tabs.Tablist>
              <Toolbar.Separator />
              <Menu.Items />
            </Menu.Toolbar>
          </Panel.Toolbar>
          <Panel.Content classNames='flex flex-col'>
            {/* Rendered by hand rather than through `Tabs.Panel`: Radix mounts its content
                hidden for a frame, and the artifact gallery's masonry measures zero there and
                never recovers. The tablist still owns the switching. */}
            {tab === 'overview' && (
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

                    {/* Above Tasks: the outline is where work is drafted, the task set where it lands.
                    `taskSet` rides along so promoting an item files it into THIS project's ledger
                    rather than into a set owned by the outline. */}
                    {outline && (
                      <Form.Section title={t('outline.label')}>
                        <Surface.Surface
                          type={AppSurface.Section}
                          data={{ subject: outline, attendableId, taskSet }}
                          limit={1}
                        />
                      </Form.Section>
                    )}

                    {milestoneRefs.length > 0 && (
                      <Form.Section title={t('milestones.label')}>
                        <MilestoneList refs={milestoneRefs} />
                      </Form.Section>
                    )}

                    <Form.Section title={t('artifacts.label')}>
                      <ObjectGallery refs={project.artifacts} onOpen={handleOpen} onDelete={handleDeleteArtifact} />
                    </Form.Section>
                  </Form.Content>
                </Form.Viewport>
              </Form.Root>
            )}

            {/* The ledger gets the whole panel here, so the list scrolls on its own rather than inside the form's viewport. */}
            {tab === 'tasks' &&
              (taskSet ? (
                // TODO(burdon): Inline component for more control?
                <Surface.Surface type={AppSurface.Section} data={{ subject: taskSet, attendableId }} limit={1} />
              ) : (
                <Flex justify='center' classNames='p-4 text-subdued'>
                  {t('no-task-set.message')}
                </Flex>
              ))}
          </Panel.Content>
        </Panel.Root>
      </Tabs.Root>
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
 * The checked rows of the project's task set, in the order the list shows them.
 *
 * The set is the multi-selection `react-ui-attention` holds under the task set's own id, which is
 * exactly what the embedded `TaskSetArticle` writes — the rows and this toolbar read one set and
 * neither owns it. Ordered by the tree walk rather than by tick order: what a reader means by
 * "these tasks" is the order they read them in, not the order they happened to tick them.
 */
const useCheckedTasks = (taskSet: TaskSet.TaskSet | undefined) => {
  const ids = useSelection(taskSet?.id, 'multi');
  const { clear } = useSelectionActions(taskSet?.id);

  // Same query the article's own list runs: membership is the ECHO parent edge, and the canonical
  // array carries sibling order, which the forest walk turns into the order rows appear in.
  const atom = useMemo(() => {
    const query = taskSet
      ? Obj.getDatabase(taskSet)?.query(Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)))
      : undefined;
    return Atom.make((get): readonly Task.Task[] => {
      if (!query || !taskSet) {
        return [];
      }

      const tasks: readonly Task.Task[] = get(query.atom);
      tasks.forEach((task) => get(Obj.atomProperty(task, 'parentTask')));
      return Task.orderTasks(tasks, get(Obj.atomProperty(taskSet, 'tasks')) ?? []);
    });
  }, [taskSet]);
  const tasks = useAtomValue(atom);

  const checkedTasks = useMemo(() => {
    const checked = new Set(ids);
    return flattenVisibleTasks(buildTaskForest(tasks)).filter((task) => checked.has(task.id));
  }, [ids, tasks]);

  return { checkedTasks, clearChecked: clear };
};

export type ToolbarActionsProps = {
  project: Project.Project;
  /** The checked rows, which the delegate action hands to one chat, in this order. */
  checkedTasks: readonly Task.Task[];
  onAddArtifact: () => void;
  /** Called once the checked tasks are delegated, so the boxes clear with the work. */
  onDelegated: () => void;
};

/**
 * The toolbar's own actions. Deliberately not spliced from the app graph: toolbar and navtree
 * actions are expected to diverge as the toolbar grows, and the graph's create-chat action serves
 * the navtree row.
 */
const useToolbarActions = ({ project, checkedTasks, onAddArtifact, onDelegated }: ToolbarActionsProps) => {
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

  // One chat for the whole checked set, not one per task: the reader is handing over a body of work,
  // and the operation is the same one the row's own menu action runs with a single task.
  const delegateTasks = useCallback(async () => {
    if (!spaceId || checkedTasks.length === 0) {
      return;
    }

    await invokePromise(
      ProjectOperation.DelegateTaskToChat,
      { tasks: checkedTasks.map((task) => Ref.make(task)) },
      { spaceId },
    );
    onDelegated();
  }, [invokePromise, spaceId, checkedTasks, onDelegated]);

  return useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'create-chat',
          {
            label: ['create-chat.label', { ns: meta.profile.key }],
            icon: 'ph--sparkle--regular',
            disposition: 'toolbar',
            testId: 'projectsPlugin.createChat',
          },
          () => void createChat(),
        )
        // Beside create-chat rather than in the overflow: it is the same gesture — start a session
        // — and it is dead until rows are checked, so a reader who checks some needs to see it.
        .action(
          'delegate-tasks',
          {
            label: ['delegate-tasks.label', { ns: meta.profile.key }],
            icon: 'ph--paper-plane-tilt--regular',
            disposition: 'toolbar',
            disabled: checkedTasks.length === 0,
            testId: 'projectsPlugin.delegateTasks',
          },
          () => void delegateTasks(),
        )
        // In the trailing overflow rather than on the toolbar: adding an artifact is occasional
        // next to starting a chat, and a bare `+` beside the tabs read as adding a tab.
        .menu(
          'overflow',
          (group) =>
            group.action(
              'add-artifact',
              {
                label: ['create-artifact.label', { ns: meta.profile.key }],
                icon: 'ph--plus--regular',
                testId: 'projectsPlugin.addArtifact',
              },
              onAddArtifact,
            ),
          'projectsPlugin.overflow',
        )
        .build(),
    [project, spaceId, invokePromise, onAddArtifact, createChat, delegateTasks, checkedTasks.length],
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
  // synchronously would leave the gallery permanently empty (the refs come off a snapshot of the
  // project, which carries no resolver, so `.target` is undefined there even once loaded).
  // `ref.atom` yields the live entity and tracks loading without tracking mutations — a rename
  // re-renders just its card, since `ObjectCard` subscribes itself.
  const objectsAtom = useMemo(
    () => Atom.make((get) => refs.map((ref) => get(ref.atom)).filter((object): object is Obj.Unknown => !!object)),
    [refs],
  );
  const objects = useAtomValue(objectsAtom);
  const items = useMemo<ObjectTileData[]>(
    () => objects.map((object) => ({ object, onClick: () => onOpen(object), onDelete: () => onDelete(object) })),
    [objects, onOpen, onDelete],
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
