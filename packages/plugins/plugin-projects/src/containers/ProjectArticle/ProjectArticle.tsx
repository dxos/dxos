//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import React, { type ReactNode, Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as InstructionsEditor from '@dxos/plugin-routine/InstructionsEditor';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as TasksUtil from '@dxos/plugin-tasks/TasksUtil';
import { useSpace } from '@dxos/react-client/echo';
import { useSelection, useSelectionActions, useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import {
  type ActionGraphProps,
  type ActionGroupBuilderFn,
  ActionToolbar,
  MenuBuilder,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import { buildTaskForest, flattenVisibleTasks } from '@dxos/react-ui-task';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Splitter from '@dxos/react-ui/Splitter';
import * as Status from '@dxos/react-ui/Status';
import * as Tabs from '@dxos/react-ui/Tabs';
import { type Milestone, Task, type TaskSet } from '@dxos/types';

import { ObjectGallery, ProjectPipeline } from '#components';
import { Feature, FeatureMap, FeatureOperation, ProjectCapabilities, ProjectOperation, ProjectView } from '#types';

import {
  useFeatureGraph,
  useOpenSpecLevel,
  useProjectSpecs,
  useRefTargets,
  useSelectedSpec,
  useSpecTreeIds,
} from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { getProjectChatPath } from '../../paths.ts';
import { useSpecMapActions } from '../SpecFeatures/spec-map-actions.ts';

// Pick the editable header fields from the Project schema rather than redeclaring them. v4 exposes
// `mapFields` only on a `Struct`, and `Type.getSchema` erases to `Codec`, so the pick runs on the AST
// and the field types are re-attached here.
type HeaderValues = Pick<Project.Project, 'name' | 'description' | 'repositories'>;

const HeaderValues = Schema.make<Schema.Codec<HeaderValues, any>>(
  SchemaAST.pick(Type.getSchema(Project.Project).ast, ['name', 'description', 'repositories']),
);

// Lazy: the canvas engine is large, and only the Specs tab needs it.
const SpecMap = lazy(() => import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecMap })));

// Lazy: only a feature's level shows it.
const FeatureDetail = lazy(() =>
  import('../FeatureArticle/index.ts').then((module) => ({ default: module.FeatureDetail })),
);

// The Context section edits only the instructions' standing context objects.
const CONTEXT_FIELDS: readonly string[] = ['objects'];

/** The pipeline pane's initial height in rem: a handful of lanes and the axis. */
const PIPELINE_SIZE = 14;

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project> & {
  /** The spec the plank shows, as a level of the nav tree names it; the Specs tab's pick when absent. */
  spec?: Spec.Spec;
  /** The feature whose breakdown the plank shows: one level down the spec. The spec itself when absent. */
  feature?: Feature.Feature;
};

/**
 * Article surface for a {@link Project}, at one level of its specs: one of the project's specs, or a feature's beneath
 * one. The tabs keep their meaning at every level and narrow to it. At the project's level, the overview is one
 * form-styled body (header fields, the owned instructions sub-form, the outline, and a card gallery of the project's
 * artifacts), and `Form.Viewport` owns the scroll and gutter so fields stay inset from the panel edges; at a feature's,
 * it is the feature. Specs is the level's own map, its toolbar picking among the project's specs at the top, and Tasks
 * the tasks working on the level's features.
 */
export const ProjectArticle = ({ role, subject, attendableId, spec: levelSpec, feature }: ProjectArticleProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  // The selected tab and the chart toggle are view state under the project's id, so they outlive
  // the plank and the reload.
  const { tab, pipeline: showPipeline, axis = 'time', legend = 'title' } = useViewState(ProjectView.aspect, subject.id);
  const { update: updateView } = useViewStateActions(ProjectView.aspect, subject.id);
  const setTab = useCallback((tab: ProjectView.Tab) => updateView((prev) => ({ ...prev, tab })), [updateView]);
  const invoker = Hooks.useOperationInvoker();
  const { invokePromise } = invoker;
  const [project, updateProject] = useObject(subject);
  const db = Obj.getDatabase(subject);
  // The pipeline reads the space's trace feed, which is addressed by space rather than database.
  const space = useSpace(db?.spaceId);
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
  const artifacts = useRefTargets(project.artifacts);
  // Membership only: fires when a milestone is added or removed, not on milestone edits.
  const [milestoneRefs = []] = useObject(taskSet, 'milestones');
  const settings = useAtomValue(Hooks.useCapability(ProjectCapabilities.Settings));
  // The level's spec: the selected one of the project's, or the one breaking the level's feature down; the Specs tab
  // offers to add it.
  const specs = useProjectSpecs(subject);
  const selectedSpec = useSelectedSpec(subject, levelSpec);
  const breakdown = useResolveRef(useObject(feature, 'spec')[0]);
  const spec = feature ? (Spec.instanceOf(breakdown) ? breakdown : undefined) : selectedSpec;
  const openLevel = useOpenSpecLevel(subject, attendableId);
  // At a spec's own level of the nav tree, picking another spec opens that one's level instead.
  const selectSpec = useCallback(
    (next: Spec.Spec) => {
      updateView((prev) => ({ ...prev, tab: 'spec', spec: next.id }));
      if (levelSpec && next.id !== levelSpec.id) {
        openLevel(next);
      }
    },
    [updateView, levelSpec, openLevel],
  );
  const handleZoom = useCallback(
    (id: string) => {
      const level = feature ?? spec;
      if (level) {
        openLevel(level, id);
      }
    },
    [openLevel, feature, spec],
  );
  const lineage = useMemo(() => (feature ? FeatureMap.getLineage(feature).map(({ id }) => id) : []), [feature]);
  const {
    mode,
    actions: specActions,
    featureActions,
  } = useSpecMapActions({
    db,
    spec,
    viewId: subject.id,
    attendableId,
    exclude: lineage,
  });
  // A level's tasks are the ones working on its feature or any feature beneath it.
  const scope = useLevelTaskIds(feature, spec);
  // The rows the embedded `TaskSetArticle` has checked; the toolbar arms its delegate action on them.
  const { tasks, delegatableTasks, uncheck } = useCheckedTasks(taskSet, scope);
  // A task added at a level works on its feature, which is what keeps it in the level's scope. A failed link leaves the
  // task in the project, where the feature's Link task can still reach it, so the draft is not kept for a second create.
  const handleTaskCreated = useMemo(
    () =>
      feature
        ? async (task: Task.Task) => {
            const { error } = await invokePromise(
              FeatureOperation.LinkTask,
              { task: Ref.make(task), feature: Ref.make(feature) },
              { spaceId: db?.spaceId },
            );
            if (error) {
              await invokePromise(LayoutOperation.AddToast, {
                id: `${ProjectsNamespace.key}/link-task-error/${Date.now()}`,
                icon: 'ph--warning--regular',
                duration: 6_000,
                title: ['link-task-error.title', { ns: ProjectsNamespace.key }],
                description: error.message,
              });
            }
          }
        : undefined,
    [feature, invokePromise, db],
  );

  // The tabs are a toolbar item like any other, so the one action graph owns the bar's order:
  // tabs, separator, then the actions. The tablist only needs the `Tabs.Root` context, which
  // wraps the whole panel.
  const tabs = useMemo(
    () => (
      <Tabs.List>
        <Tabs.Trigger value='overview' data-testid='projectsPlugin.tab.overview'>
          {t('overview.label')}
        </Tabs.Trigger>
        <Tabs.Trigger value='spec' data-testid='projectsPlugin.tab.spec'>
          {t('specs.label')}
        </Tabs.Trigger>
        <Tabs.Trigger value='tasks' data-testid='projectsPlugin.tab.tasks'>
          {t('tasks.label')}
        </Tabs.Trigger>
      </Tabs.List>
    ),
    [t],
  );
  // The chart splits the Tasks tab, under the ledger: the rows above name the lanes, so the chart
  // shows only the drawing.
  const setAxis = useCallback((axis: ProjectView.Axis) => updateView((prev) => ({ ...prev, axis })), [updateView]);
  const setLegend = useCallback(
    (legend: ProjectView.Legend) => updateView((prev) => ({ ...prev, legend })),
    [updateView],
  );
  const togglePipeline = useCallback(
    () => updateView((prev) => ({ ...prev, tab: 'tasks', pipeline: !prev.pipeline })),
    [updateView],
  );

  // A session starting is what the chart is for, so a delegation run from this app — the toolbar or
  // a row's menu — brings the pipeline into view. Read off the invoker's own events rather than
  // inferred from the chat query, which also emits as a project's history hydrates and would open
  // the chart on every project that has ever had a session.
  useEffect(() => {
    const fiber = Effect.runFork(
      Stream.fromPubSub(invoker.invocations).pipe(
        Stream.filter(
          (event) => event.operation.meta.key.toString() === ProjectOperation.DelegateTaskToChat.meta.key.toString(),
        ),
        Stream.runForEach((event) =>
          Effect.sync(() => {
            const chat: unknown = event.output?.chat;
            if (Obj.instanceOf(Chat.Chat, chat) && Chat.peekProject(chat)?.id === subject.id) {
              updateView((prev) => ({ ...prev, tab: 'tasks', pipeline: true }));
            }
          }),
        ),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [invoker, subject.id, updateView]);

  const handleAddSpec = useCallback(async () => {
    const { data: ref } = await invokePromise(SpaceOperation.OpenObjectForm, {
      target: subject,
      typename: Type.getTypename(Spec.Spec),
      targetNodeId: attendableId,
      navigable: false,
    });
    const added = ref?.target;
    if (!Spec.instanceOf(added)) {
      return;
    }

    updateProject((project) => {
      project.specs.push(Ref.make(added));
    });
    selectSpec(added);
  }, [subject, attendableId, invokePromise, updateProject, selectSpec]);

  // The spec picker leads the Specs tab's tools at the top of a spec; a feature's level is inside one spec already.
  const pickerActions = useSpecPickerActions({
    specs,
    selected: feature ? undefined : spec,
    onSelect: selectSpec,
    onAdd: () => void handleAddSpec(),
  });
  const levelActions = useCallback<ActionGroupBuilderFn>(
    (group) => {
      if (!feature) {
        pickerActions(group);
      }
      if (spec) {
        specActions(group);
      }
    },
    [feature, spec, pickerActions, specActions],
  );

  const menuActions = useToolbarActions({
    project: subject,
    tabs,
    specActions: tab === 'spec' && spec ? levelActions : undefined,
    featureActions: tab === 'spec' && spec ? featureActions : undefined,
    checkedTasks: delegatableTasks,
    showPipeline,
    onAddArtifact: () => void handleAddArtifact(),
    onDelegated: uncheck,
    onTogglePipeline: togglePipeline,
  });

  // A session lane on the chart is the way into its chat. The project's own path helper, not the
  // navigation resolver: the resolver answers with the assistant's Chats section, which lists only
  // unparented chats, so that path names a node the deck cannot render.
  // The same navigation the task ledger's rows use, under the same context, so a lane picked in the
  // chart selects its row and opens the task where a row click would.
  const openTask = ToolkitHooks.useDetailNavigation({
    contextId: attendableId,
    getPath: (id) => `${attendableId}/${id}`,
  });

  const handleSelectChat = useCallback(
    (chat: Chat.Chat) => {
      if (!db) {
        return;
      }
      void invokePromise(LayoutOperation.Open, {
        subject: [getProjectChatPath(db.spaceId, subject.id, chat.id)],
        pivotId: attendableId,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [invokePromise, db, subject.id, attendableId],
  );

  // Read once per project identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<HeaderValues>>(
    () => ({ name: project.name, description: project.description, repositories: project.repositories }),
    [subject],
  );

  const handleOpen = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(LayoutOperation.Open, {
        subject: [GraphPath.getObjectPathFromObject(object)],
        pivotId: attendableId,
        disposition: 'add',
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
      void invokePromise(SpaceOperation.RemoveObjects, { objects: [object] }, { spaceId: db?.spaceId });
    },
    [invokePromise, updateProject, db],
  );

  const handleAddArtifact = useCallback(async () => {
    if (!db) {
      return;
    }

    const { data: ref } = await invokePromise(SpaceOperation.OpenObjectForm, {
      target: subject,
      targetNodeId: attendableId,
      navigable: false,
    });
    if (!ref) {
      return;
    }

    updateProject((project) => {
      project.artifacts = [...project.artifacts, ref];
    });
  }, [db, subject, attendableId, invokePromise, updateProject]);

  const handleValuesChanged = useCallback(
    (values: Partial<HeaderValues>) => {
      updateProject((project) => {
        project.name = values.name;
        project.description = values.description;
        project.repositories = values.repositories && [...values.repositories];
      });
    },
    [updateProject],
  );

  if (!db) {
    return null;
  }

  return (
    <Tabs.Root
      asChild
      orientation='horizontal'
      value={tab}
      onValueChange={(value) => setTab(Schema.decodeUnknownSync(ProjectView.Tab)(value))}
    >
      <Panel.Root role={role}>
        <Panel.Header>
          <ActionToolbar {...menuActions} attendableId={attendableId} />
        </Panel.Header>
        <Panel.Body>
          {/* Rendered by hand rather than through `Tabs.Panel`: Radix mounts its content
              hidden for a frame, and the artifact gallery's masonry measures zero there and
              never recovers. The tablist still owns the switching. */}
          {tab === 'overview' && feature && (
            <Suspense fallback={null}>
              <FeatureDetail
                feature={feature}
                attendableId={attendableId}
                onSelectSubfeature={(id) => openLevel(feature, id)}
              />
            </Suspense>
          )}

          {tab === 'overview' && !feature && (
            <Form.Root
              db={db}
              schema={HeaderValues}
              defaultValues={defaultValues}
              onValuesChanged={handleValuesChanged}
            >
              <Form.Viewport scroll>
                <Form.Content>
                  <Form.Fields />

                  {specs.length > 0 && (
                    <Form.FieldSet label={t('specs.label')} data-testid='projectsPlugin.spec'>
                      {specs.map((spec) => (
                        <SpecSummary key={spec.id} spec={spec} onOpen={() => selectSpec(spec)} />
                      ))}
                    </Form.FieldSet>
                  )}

                  {instructions && <InstructionsEditor.InstructionsEditor db={db} instructions={instructions} />}

                  {/* Standing context (inputs bound into every project session) — deliberately a
                      separate labeled section from Artifacts (outputs the project owns). */}
                  {instructions && (
                    <Form.FieldSet label={t('context.label')}>
                      <InstructionsEditor.InstructionsEditor
                        db={db}
                        instructions={instructions}
                        fields={CONTEXT_FIELDS}
                      />
                    </Form.FieldSet>
                  )}

                  {/* Above Tasks: the outline is where work is drafted, the task set where it lands.
                    `taskSet` rides along so promoting an item files it into THIS project's ledger
                    rather than into a set owned by the outline. */}
                  {outline && (
                    <Form.FieldSet label={t('outline.label')} description={t('outline.description')}>
                      <Surface.Surface
                        type={AppSurface.Section}
                        data={{ subject: outline, attendableId, taskSet }}
                        limit={1}
                      />
                    </Form.FieldSet>
                  )}

                  {milestoneRefs.length > 0 && (
                    <Form.FieldSet label={t('milestones.label')}>
                      <MilestoneList refs={milestoneRefs} />
                    </Form.FieldSet>
                  )}

                  <Form.FieldSet label={t('artifacts.label')} data-testid='projectsPlugin.artifacts'>
                    <ObjectGallery objects={artifacts} onOpen={handleOpen} onDelete={handleDeleteArtifact} />
                  </Form.FieldSet>

                  {/* Settings other plugins keep for this project, such as its folder on this device. */}
                  <Surface.Surface type={ProjectView.Settings} data={{ project: subject }} />
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          )}

          {tab === 'spec' &&
            (spec ? (
              <Suspense fallback={null}>
                <SpecMap spec={spec} mode={mode} attendableId={attendableId} onZoom={handleZoom} />
              </Suspense>
            ) : (
              <AddSpec project={subject} feature={feature} />
            ))}

          {/* The ledger gets the whole panel here, so the list scrolls on its own rather than inside the form's viewport. */}
          {tab === 'tasks' && !taskSet && <Status.Empty>{t('no-task-set.message')}</Status.Empty>}
          {/* One splitter whether or not the chart is shown: collapsing to the ledger keeps the pane the
              section lays out in, so its add row stays below the list rather than past the panel. */}
          {tab === 'tasks' && taskSet && (
            <Splitter.Root
              orientation='vertical'
              anchor='end'
              resizable
              defaultSize={PIPELINE_SIZE}
              mode={showPipeline && space ? 'split' : 'start'}
            >
              <Splitter.Panel position='start'>
                {/* TODO(burdon): Inline component for more control? */}
                <Surface.Surface
                  type={AppSurface.Section}
                  data={{
                    subject: taskSet,
                    attendableId,
                    // Unset means shown: settings saved before the preference existed hold no key.
                    showDescription: settings.showTaskDescriptions ?? true,
                    scope,
                    onTaskCreated: handleTaskCreated,
                  }}
                  limit={1}
                />
              </Splitter.Panel>
              <Splitter.ResizeTrigger />
              <Splitter.Panel position='end'>
                {/* Mounted only while shown: the chart rebuilds its whole timeline from the space's
                    trace feed on every trace message, which is pure cost behind a collapsed panel. */}
                {/* The chart fills the panel and scrolls both ways itself, so its horizontal bar sits at the panel's foot. */}
                {showPipeline && space && (
                  <ProjectPipeline
                    space={space}
                    project={subject}
                    tasks={tasks}
                    axis={axis}
                    onAxisChange={setAxis}
                    legend={legend}
                    onLegendChange={setLegend}
                    onSelectTask={openTask}
                    onSelectChat={handleSelectChat}
                  />
                )}
              </Splitter.Panel>
            </Splitter.Root>
          )}
        </Panel.Body>
      </Panel.Root>
    </Tabs.Root>
  );
};

ProjectArticle.displayName = 'ProjectArticle';

/** Read-only: milestones are authored through the agent/MCP verbs, and store no status to render. */
const MilestoneList = ({ refs }: { refs: ReadonlyArray<Ref.Ref<Milestone.Milestone>> }) => (
  <Layout.Container role='list' gap='sm' gutter='none'>
    {refs.map((milestoneRef) => (
      <MilestoneRow key={milestoneRef.uri.toString()} milestoneRef={milestoneRef} />
    ))}
  </Layout.Container>
);

/**
 * One line over one of the project's specs, counting every feature on its map and the maps nested beneath it: how many
 * there are by status, and how many have an implementing task still open. The spec's name opens it on the Specs tab.
 */
const SpecSummary = ({ spec, onOpen }: { spec: Spec.Spec; onOpen: () => void }) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const [name] = useObject(spec, 'name');
  const ids = useSpecTreeIds(spec);
  const { features } = useFeatureGraph(Obj.getDatabase(spec), ids);
  const counts = Feature.Status.literals.flatMap((status) => {
    const count = features.filter((feature) => feature.status === status).length;
    return count > 0
      ? [t('feature-board.status-count.label', { count, status: t(`feature-status.${status}.label`) })]
      : [];
  });
  const open = features.filter((feature) => feature.tasks.some((task) => !task.done)).length;

  return (
    <Layout.Flex gap='sm' align='center' classNames='min-w-0 flex-wrap' data-testid='projectsPlugin.specSummary'>
      <Button.Root variant='ghost' icon='ph--blueprint--regular' label={name} onClick={onOpen} />
      <span className='text-fg-subtle'>
        {[t('spec-summary.features.label', { count: features.length }), ...counts].join(' · ')}
      </span>
      {open > 0 && <span className='text-fg-subtle'>{t('spec-summary.open-tasks.label', { count: open })}</span>}
    </Layout.Flex>
  );
};

/** The Specs tab of a level without a spec: the offer to add one, owned by the project or breaking the feature down. */
const AddSpec = ({ project, feature }: { project: Project.Project; feature?: Feature.Feature }) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const spaceId = Obj.getDatabase(project)?.spaceId;
  // Named after what it maps: the feature it breaks down, or the project.
  const handleAdd = useCallback(
    () =>
      void invokePromise(
        FeatureOperation.CreateSpec,
        feature
          ? { name: feature.name, feature: Ref.make(feature) }
          : { name: project.name ?? '', project: Ref.make(project) },
        { spaceId },
      ),
    [invokePromise, project, feature, spaceId],
  );

  return (
    <Layout.Flex column center gap='sm' classNames='h-full' data-testid='projectsPlugin.spec.empty'>
      <Status.Empty icon='ph--blueprint--regular'>
        {t(feature ? 'feature-spec.empty.message' : 'spec.empty.message')}
      </Status.Empty>
      <Button.Root icon='ph--plus--regular' data-testid='projectsPlugin.addSpec' onClick={handleAdd}>
        {t('add-spec.label')}
      </Button.Root>
    </Layout.Flex>
  );
};

type SpecPickerActionsProps = {
  specs: readonly Spec.Spec[];
  /** The spec shown; no picker without one. */
  selected?: Spec.Spec;
  onSelect: (spec: Spec.Spec) => void;
  onAdd: () => void;
};

/** A dropdown of the project's specs, the one shown checked, ending in an action to add another. */
const useSpecPickerActions = ({ specs, selected, onSelect, onAdd }: SpecPickerActionsProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  return useCallback<ActionGroupBuilderFn>(
    (group) => {
      if (!selected) {
        return;
      }
      group.group(
        'specs',
        {
          variant: 'dropdownMenu',
          selectCardinality: 'single',
          applyActive: true,
          value: selected.id,
          icon: 'ph--blueprint--regular',
          label: ['specs.label', { ns: ProjectsNamespace.key }],
          testId: 'projectsPlugin.specPicker',
        },
        (group) => {
          specs.forEach((spec) =>
            group.action(
              spec.id,
              {
                label: spec.name || t('untitled-spec.label'),
                icon: 'ph--blueprint--regular',
                checked: spec.id === selected.id,
              },
              () => onSelect(spec),
            ),
          );
          group.separator('line').action(
            'add-spec',
            {
              label: ['add-spec.label', { ns: ProjectsNamespace.key }],
              icon: 'ph--plus--regular',
              testId: 'projectsPlugin.addSpec',
            },
            onAdd,
          );
        },
      );
      group.separator();
    },
    [specs, selected, onSelect, onAdd, t],
  );
};

/**
 * Ids of the tasks working on the feature or any feature beneath it, through its breakdown; undefined at the project's
 * own level, whose tasks are all of them.
 */
const useLevelTaskIds = (feature: Feature.Feature | undefined, spec: Spec.Spec | undefined) => {
  const treeIds = useSpecTreeIds(feature ? spec : undefined);
  const ids = useMemo(() => (feature ? [feature.id, ...treeIds] : []), [feature, treeIds]);
  const { features } = useFeatureGraph(feature && Obj.getDatabase(feature), ids);
  const key = [...new Set(features.flatMap(({ tasks }) => tasks.map(({ id }) => id)))].join(',');
  return useMemo(() => (feature ? (key ? key.split(',') : []) : undefined), [feature, key]);
};

/** One row, holding its own subscription so a rename re-renders just that row. */
const MilestoneRow = ({ milestoneRef }: { milestoneRef: Ref.Ref<Milestone.Milestone> }) => {
  const [milestone] = useObject(milestoneRef);
  if (!milestone) {
    return null;
  }

  return (
    <Layout.Flex role='listitem' gap='sm' align='center' classNames='min-w-0'>
      <Icon.Icon icon='ph--flag--regular' valence='info' />
      <span className='truncate'>{milestone.name}</span>
      {milestone.targetDate && <span className='text-fg-subtle shrink-0'>{milestone.targetDate}</span>}
    </Layout.Flex>
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
const useCheckedTasks = (taskSet: TaskSet.TaskSet | undefined, scope?: readonly string[]) => {
  const ids = useSelection(taskSet?.id, 'multi');
  const { multi } = useSelectionActions(taskSet?.id);

  // Same query the article's own list runs: membership is the ECHO parent edge, and the `tasks` and
  // `subtasks` lists carry sibling order, which the tree walk turns into the order rows appear in.
  const atom = useMemo(() => {
    const query = taskSet
      ? Obj.getDatabase(taskSet)?.query(Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)))
      : undefined;
    return Atom.make((get): readonly Task.Task[] => {
      if (!query || !taskSet) {
        return [];
      }

      const tasks: readonly Task.Task[] = get(query.atom);
      tasks.forEach((task) => {
        get(Obj.atomProperty(task, 'subtasks'));
        // The delegate action arms on whether the agent already holds a checked row, and delegation
        // writes both fields — without tracking them the bar would keep offering rows already handed over.
        get(Obj.atomProperty(task, 'status'));
        get(Obj.atomProperty(task, 'assignee'));
      });
      return Task.orderTree(tasks, get(Obj.atomProperty(taskSet, 'tasks')) ?? []);
    });
  }, [taskSet]);
  const setTasks = useAtomValue(atom);
  // The level's tasks as its ledger shows them, so a row checked on another level is neither charted nor delegated.
  const scopeKey = scope?.join(',');
  const tasks = useMemo(
    () => (scopeKey === undefined ? setTasks : TasksUtil.withinScope(setTasks, new Set(scopeKey.split(',')))),
    [setTasks, scopeKey],
  );

  const checkedTasks = useMemo(() => {
    const checked = new Set(ids);
    return flattenVisibleTasks(buildTaskForest(tasks)).filter((task) => checked.has(task.id));
  }, [ids, tasks]);

  // A row the agent is already working on is left out rather than handed to a second session.
  const delegatableTasks = useMemo(() => checkedTasks.filter((task) => !Task.isAgentWorking(task)), [checkedTasks]);

  // Only the given rows, since rows checked on another level stay checked while this one shows.
  const uncheck = useCallback(
    (done: readonly Task.Task[]) => {
      const doneIds = new Set(done.map(({ id }) => id));
      multi(ids.filter((id) => !doneIds.has(id)));
    },
    [ids, multi],
  );

  return { tasks, checkedTasks, delegatableTasks, uncheck };
};

export type FeatureLevelArticleProps = AppSurface.ObjectArticleProps<Feature.Feature>;

/** A feature's level of the project tracking it: the project article narrowed to the feature. */
export const FeatureLevelArticle = ({ subject, ...props }: FeatureLevelArticleProps) => {
  const project = FeatureMap.findProject(subject);
  return project ? (
    <ProjectArticle {...props} subject={project} spec={FeatureMap.findRoot(subject)} feature={subject} />
  ) : null;
};

export type SpecLevelArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/** A spec's level of the project owning it: the project article on that spec. */
export const SpecLevelArticle = ({ subject, ...props }: SpecLevelArticleProps) => {
  const project = Project.getOwner(subject);
  return project ? <ProjectArticle {...props} subject={project} spec={subject} /> : null;
};

export type ToolbarActionsProps = {
  project: Project.Project;
  /** The view tabs, rendered as the bar's leading item. */
  tabs: ReactNode;
  /** The level's spec picker and map actions, on the Specs tab: placed after the tabs. */
  specActions?: ActionGroupBuilderFn;
  /** Adding features to the level's map, offered with the same condition: grouped first in the overflow. */
  featureActions?: ActionGroupBuilderFn;
  /** The checked rows not already with the agent, which the delegate action hands to one chat, in this order. */
  checkedTasks: readonly Task.Task[];
  /** Whether the pipeline chart is shown under the ledger. */
  showPipeline: boolean;
  onAddArtifact: () => void;
  /** Called once the checked tasks are delegated, so the boxes clear with the work. */
  onDelegated: (tasks: readonly Task.Task[]) => void;
  onTogglePipeline: () => void;
};

/**
 * The toolbar's own actions. Deliberately not spliced from the app graph: toolbar and navtree
 * actions are expected to diverge as the toolbar grows, and the graph's create-chat action serves
 * the navtree row.
 */
const useToolbarActions = ({
  project,
  tabs,
  specActions,
  featureActions,
  checkedTasks,
  showPipeline,
  onAddArtifact,
  onDelegated,
  onTogglePipeline,
}: ToolbarActionsProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
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
    Chat.seedSession(chat, project.session);
    await invokePromise(SpaceOperation.AddObject, { object: chat }, { spaceId });
    await invokePromise(AssistantOperation.SetCurrentChat, { companionTo: project, chat }, { spaceId });
  }, [invokePromise, project, spaceId]);

  // Held in state so the bar redraws disabled for the whole invocation: a ref would guard the
  // handler but leave the button live, and the operation runs long enough (chat, bind, first turn)
  // for a second click to land.
  const [delegating, setDelegating] = useState(false);

  // One chat for the whole checked set, not one per task: the reader is handing over a body of work,
  // and the operation is the same one the row's own menu action runs with a single task.
  const delegateTasks = useCallback(async () => {
    if (!spaceId || checkedTasks.length === 0 || delegating) {
      return;
    }

    setDelegating(true);
    try {
      const { data } = await invokePromise(
        ProjectOperation.DelegateTaskToChat,
        { tasks: checkedTasks.map((task) => Ref.make(task)) },
        { spaceId },
      );
      // Only a delegation that produced a chat moves the reader on; a refused one keeps the
      // selection so they can correct it and retry.
      if (data?.chat) {
        onDelegated(checkedTasks);
      }
    } finally {
      setDelegating(false);
    }
  }, [invokePromise, spaceId, checkedTasks, delegating, onDelegated]);

  return useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'tabs',
          {
            variant: 'custom',
            label: ['views.label', { ns: ProjectsNamespace.key }],
            render: () => tabs,
          },
          () => {},
        )
        // The map's views sit between two gaps, centred between the tabs and the tools, so the level needs no second bar.
        .separator()
        .subgraph(
          specActions &&
            ((group) => {
              specActions(group);
              group.separator();
            }),
        )
        .action(
          'create-chat',
          {
            label: ['create-chat.label', { ns: ProjectsNamespace.key }],
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
            label: ['delegate-tasks.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--paper-plane-tilt--regular',
            disposition: 'toolbar',
            disabled: checkedTasks.length === 0 || delegating,
            testId: 'projectsPlugin.delegateTasks',
          },
          () => void delegateTasks(),
        )
        // A toggle rather than a tab: the chart accompanies the ledger rather than replacing it.
        .group(
          'view',
          {
            label: ['view.label', { ns: ProjectsNamespace.key }],
            variant: 'toggleGroup',
            selectCardinality: 'multiple',
            value: showPipeline ? ['pipeline'] : [],
          },
          (group) =>
            group.action(
              'pipeline',
              {
                label: [showPipeline ? 'hide-pipeline.label' : 'show-pipeline.label', { ns: ProjectsNamespace.key }],
                icon: 'ph--chart-bar-horizontal--regular',
                testId: 'projectsPlugin.pipeline',
              },
              onTogglePipeline,
            ),
        )
        // In the trailing overflow rather than on the toolbar: adding an artifact or a feature is
        // occasional next to starting a chat, and a bare `+` beside the tabs read as adding a tab.
        .menu(
          'overflow',
          (group) =>
            group
              .subgraph(
                featureActions &&
                  ((group) => {
                    featureActions(group);
                    group.separator('line');
                  }),
              )
              .action(
                'add-artifact',
                {
                  label: ['create-artifact.label', { ns: ProjectsNamespace.key }],
                  icon: 'ph--plus--regular',
                  testId: 'projectsPlugin.addArtifact',
                },
                onAddArtifact,
              ),
          'projectsPlugin.overflow',
        )
        .build(),
    [
      project,
      tabs,
      spaceId,
      invokePromise,
      onAddArtifact,
      createChat,
      delegateTasks,
      specActions,
      featureActions,
      checkedTasks.length,
      delegating,
      showPipeline,
      onTogglePipeline,
    ],
  );
};
