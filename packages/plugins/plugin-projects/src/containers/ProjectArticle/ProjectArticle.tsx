//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { withDialects } from '@dxos/deus/dialect';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as TaskSetView from '@dxos/plugin-tasks/TaskSetView';
import { useSpace } from '@dxos/react-client/echo';
import { useSelection, useSelectionActions, useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Form, type FormFieldOverride, type FormUpdateMeta, useCreateObject } from '@dxos/react-ui-form';
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
import * as Typography from '@dxos/react-ui/Typography';
import { type Milestone, Task, type TaskSet } from '@dxos/types';

import { ObjectGallery, ProjectPipeline } from '#components';
import { ProjectCapabilities, ProjectOperation, ProjectView } from '#types';

import {
  SpecToolbarProvider,
  useFieldExtensions,
  useProjectSpecTree,
  useRefTargets,
  useSelectedSpec,
  useSelectSpec,
  useSpecToolbarSlot,
} from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { getProjectChatPath } from '../../paths.ts';
import { type SpecTreeEntry } from '../../util/spec-tree.ts';
import { ConfigSection } from './ConfigSection.tsx';

// Pick the editable header fields from the Project schema rather than redeclaring them. v4 exposes
// `mapFields` only on a `Struct`, and `Type.getSchema` erases to `Codec`, so the pick runs on the AST
// and the field types are re-attached here.
type HeaderValues = Pick<Project.Project, 'name' | 'status' | 'description' | 'specs'>;

const HeaderValues = Schema.make<Schema.Codec<HeaderValues, any>>(
  SchemaAST.pick(Type.getSchema(Project.Project).ast, ['name', 'status', 'description', 'specs']),
);

const ARTIFACT_LIMIT = 6;

/** The Specs tab's own view of its spec: the text. */

/** The pipeline pane's initial height in rem: a handful of lanes and the axis. */
const PIPELINE_SIZE = 14;

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project>;

/**
 * Article surface for a {@link Project}. The overview is one form-styled body (header fields, the owned instructions
 * sub-form, the outline, and a card gallery of the project's artifacts), and `Form.Viewport` owns the scroll and gutter
 * so fields stay inset from the panel edges. Specs is one spec, as text or a view other plugins offer, its toolbar
 * picking among the project's specs and those nested beneath them. Tasks is the project's task set.
 */
export const ProjectArticle = ({ role, subject, attendableId }: ProjectArticleProps) => {
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
  const { update: updateTaskView } = useViewStateActions(TaskSetView.aspect, taskSet?.id);
  const handleOpenMilestone = useCallback(
    (milestone: Milestone.Milestone) => {
      updateTaskView((view) => ({ ...view, milestone: milestone.id }));
      setTab('tasks');
    },
    [updateTaskView, setTab],
  );
  const settings = useAtomValue(Hooks.useCapability(ProjectCapabilities.Settings));
  // The spec the Specs tab shows: the reader's pick among the project's specs and those nested beneath them.
  const specTree = useProjectSpecTree(subject);
  const spec = useSelectedSpec(subject);
  const selectSpec = useSelectSpec(subject);
  const dialectActions = useSpecPackageActions(spec);
  // The rows the embedded `TaskSetArticle` has checked; the toolbar arms its delegate action on them.
  const { tasks, delegatableTasks, uncheck } = useCheckedTasks(taskSet);

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
    const added = await ref?.load();
    if (!Spec.instanceOf(added)) {
      return;
    }

    updateProject((project) => {
      project.specs.push(Ref.make(added));
    });
    selectSpec(added);
  }, [subject, attendableId, invokePromise, updateProject, selectSpec]);

  const pickerActions = useSpecPickerActions({
    specs: specTree,
    selected: spec,
    onSelect: selectSpec,
    onAdd: () => void handleAddSpec(),
  });
  // The spec section's editor tools, which it puts here rather than in a second toolbar of its own.
  const { slot: specToolbarSlot, actions: editorActions } = useSpecToolbarSlot();
  // The Specs tab's tools: which spec, its editor's, and its dialects.
  const specActions = useCallback<ActionGroupBuilderFn>(
    (group) => {
      pickerActions(group);
      if (spec) {
        group.subgraph(editorActions);
        dialectActions(group);
      }
    },
    [spec, pickerActions, editorActions, dialectActions],
  );

  const menuActions = useToolbarActions({
    project: subject,
    tab,
    tabs,
    specActions: spec ? specActions : undefined,
    checkedTasks: delegatableTasks,
    showPipeline,
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

  const extensions = useFieldExtensions(subject);
  const handleCreate = useCreateObject(db);
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      name: { presentation: 'title', placeholder: t('untitled-project.label'), collaborative: true },
      // A status once picked is never cleared, so the pill offers no "None".
      status: { required: true },
      description: { presentation: 'plain', placeholder: t('project-description.placeholder'), collaborative: true },
      specs: { presentation: 'section', label: t('specs.label'), placeholder: t('specs-empty.message') },
    }),
    [t],
  );
  const [showAllArtifacts, setShowAllArtifacts] = useState(false);
  const shownArtifacts = showAllArtifacts ? artifacts : artifacts.slice(0, ARTIFACT_LIMIT);

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

  // Only the edited paths are written, so changing the status does not rewrite the specs. The name and description are
  // collaborative, so their edits reach the project directly and never arrive here.
  const handleValuesChanged = useCallback(
    (values: Partial<HeaderValues>, { changed }: FormUpdateMeta<HeaderValues>) => {
      const paths = Object.keys(changed)
        .filter(SchemaEx.isJsonPath)
        .filter((path) => changed[path]);
      updateProject((project) => {
        for (const path of paths) {
          const value = SchemaEx.getValue(values, path);
          if (value !== Obj.getValue(project, SchemaEx.splitJsonPath(path))) {
            Obj.setValue(project, SchemaEx.splitJsonPath(path), value);
          }
        }
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
          {tab === 'overview' && (
            <Form.Root
              db={db}
              schema={HeaderValues}
              values={project}
              extensions={extensions}
              fieldOverrides={fieldOverrides}
              onValuesChanged={handleValuesChanged}
              onCreate={handleCreate}
            >
              <Form.Viewport scroll>
                <Form.Content>
                  <Layout.Flex align='center' gap='sm'>
                    <Layout.Flex column grow>
                      <Form.Fields include={['name']} />
                    </Layout.Flex>
                    <Form.Fields include={['status']} layout='tag' />
                  </Layout.Flex>
                  <Form.Fields include={['description']} />

                  {/* Above Tasks: the outline is where work is drafted, the task set where it lands.
                    `taskSet` rides along so promoting an item files it into THIS project's ledger
                    rather than into a set owned by the outline. */}
                  {outline && (
                    <Form.FieldSet label={t('outline.label')} data-testid='projectsPlugin.outline'>
                      <Surface.Surface
                        type={AppSurface.Section}
                        data={{ subject: outline, attendableId, taskSet }}
                        limit={1}
                      />
                    </Form.FieldSet>
                  )}

                  <Form.FieldSet
                    label={t('artifacts.label')}
                    data-testid='projectsPlugin.artifacts'
                    actions={
                      <>
                        {artifacts.length > ARTIFACT_LIMIT && (
                          // TODO(wittjosiah): Open a companion listing every artifact rather than growing the overview.
                          <Button.Root
                            variant='ghost'
                            data-testid='projectsPlugin.artifacts.showAll'
                            onClick={() => setShowAllArtifacts((showAll) => !showAll)}
                          >
                            {showAllArtifacts
                              ? t('show-fewer-artifacts.label')
                              : t('show-all-artifacts.label', { count: artifacts.length })}
                          </Button.Root>
                        )}
                        <Button.Root
                          iconOnly
                          variant='ghost'
                          icon='ph--plus--regular'
                          label={t('create-artifact.label')}
                          data-testid='projectsPlugin.addArtifact'
                          onClick={() => void handleAddArtifact()}
                        />
                      </>
                    }
                  >
                    {artifacts.length > 0 ? (
                      <ObjectGallery objects={shownArtifacts} onOpen={handleOpen} onDelete={handleDeleteArtifact} />
                    ) : (
                      <Typography.Text tone='muted' data-testid='projectsPlugin.artifacts.empty'>
                        {t('artifacts-empty.message')}
                      </Typography.Text>
                    )}
                  </Form.FieldSet>

                  {milestoneRefs.length > 0 && (
                    <Form.FieldSet label={t('milestones.label')}>
                      <MilestoneList refs={milestoneRefs} tasks={tasks} onOpen={handleOpenMilestone} />
                    </Form.FieldSet>
                  )}

                  <Form.Fields include={['specs']} />

                  <ConfigSection db={db} project={subject} instructions={instructions} />
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          )}

          {tab === 'spec' &&
            spec && (
              // A section rather than an article: the spec's own page is for opening it. Its other views are companions.
              <div className='grid min-h-0 h-full' data-testid='projectsPlugin.spec.document'>
                <SpecToolbarProvider value={specToolbarSlot}>
                  <Surface.Surface type={AppSurface.Section} data={{ subject: spec, attendableId }} limit={1} />
                </SpecToolbarProvider>
              </div>
            )}
          {tab === 'spec' && !spec && <AddSpec onAdd={() => void handleAddSpec()} />}

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
                    showDescription: settings.showTaskDescriptions ?? false,
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

type MilestoneListProps = {
  refs: ReadonlyArray<Ref.Ref<Milestone.Milestone>>;
  tasks: readonly Task.Task[];
  onOpen: (milestone: Milestone.Milestone) => void;
};

/** Read-only: milestones are authored through the agent/MCP verbs. */
const MilestoneList = ({ refs, tasks, onOpen }: MilestoneListProps) => (
  <Layout.Container role='list' gap='sm' gutter='none'>
    {refs.map((milestoneRef) => (
      <MilestoneRow key={milestoneRef.uri.toString()} milestoneRef={milestoneRef} tasks={tasks} onOpen={onOpen} />
    ))}
  </Layout.Container>
);

/** The Specs tab of a project without a spec: the offer to add one. */
const AddSpec = ({ onAdd }: { onAdd: () => void }) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  return (
    <Layout.Flex column center gap='sm' classNames='h-full' data-testid='projectsPlugin.spec.empty'>
      <Status.Empty icon='ph--blueprint--regular'>{t('spec.empty.message')}</Status.Empty>
      <Button.Root icon='ph--plus--regular' data-testid='projectsPlugin.addSpec' onClick={onAdd}>
        {t('add-spec.label')}
      </Button.Root>
    </Layout.Flex>
  );
};

type SpecPickerActionsProps = {
  specs: readonly SpecTreeEntry[];
  /** The spec shown; no picker without one. */
  selected?: Spec.Spec;
  onSelect: (spec: Spec.Spec) => void;
  onAdd: () => void;
};

/**
 * A dropdown of the project's specs, each with the specs nested beneath it indented under it, named after the one shown
 * and checking it, ending in an action to add another.
 */
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
          // The trigger names the spec shown.
          applyActive: true,
          iconOnly: false,
          value: selected.id,
          icon: 'ph--blueprint--regular',
          label: ['specs.label', { ns: ProjectsNamespace.key }],
          testId: 'projectsPlugin.specPicker',
        },
        (group) => {
          specs.forEach(({ spec, depth }) =>
            group.action(
              spec.id,
              {
                label: spec.name || t('untitled-spec.label'),
                icon: 'ph--blueprint--regular',
                checked: spec.id === selected.id,
                indent: depth,
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
      group.separator('line');
    },
    [specs, selected, onSelect, onAdd, t],
  );
};

/**
 * A multi-select of the extension packages plugins offer, checking those whose dialects the spec all uses; checking one
 * adds its dialects, whose companion views then show, and unchecking removes them, leaving the base dialects for none.
 */
const useSpecPackageActions = (spec: Spec.Spec | undefined) => {
  const packages = Hooks.useCapabilities(ProjectCapabilities.SpecPackage);
  const [used] = useObject(spec, 'dialects');
  const toggle = useCallback(
    (dialects: readonly string[], checked: boolean) =>
      spec &&
      Obj.update(spec, (spec) => {
        // One edit per id, so toggles of different packages on two peers merge.
        const next = withDialects(spec.dialects, dialects, !checked);
        for (let index = spec.dialects.length - 1; index >= 0; index--) {
          if (!next.includes(spec.dialects[index])) {
            spec.dialects.splice(index, 1);
          }
        }
        next.filter((id) => !spec.dialects.includes(id)).forEach((id) => spec.dialects.push(id));
      }),
    [spec],
  );
  return useCallback<ActionGroupBuilderFn>(
    (group) => {
      if (!spec || packages.length === 0) {
        return;
      }
      const checked = packages.map(({ dialects }) => dialects.every((id) => used?.includes(id)));
      group.group(
        'packages',
        {
          variant: 'dropdownMenu',
          selectCardinality: 'multiple',
          value: packages.filter((_, index) => checked[index]).map(({ id }) => id),
          icon: 'ph--puzzle-piece--regular',
          label: ['spec-extensions.label', { ns: ProjectsNamespace.key }],
          testId: 'projectsPlugin.specExtensions',
        },
        (group) =>
          packages.forEach(({ id, label, dialects }, index) =>
            group.action(id, { label, checked: checked[index], testId: `projectsPlugin.specPackage.${id}` }, () =>
              toggle(dialects, checked[index]),
            ),
          ),
      );
    },
    [spec, packages, used, toggle],
  );
};

/** One row, holding its own subscription so a rename re-renders just that row. */
const MilestoneRow = ({
  milestoneRef,
  tasks,
  onOpen,
}: {
  milestoneRef: Ref.Ref<Milestone.Milestone>;
  tasks: readonly Task.Task[];
  onOpen: (milestone: Milestone.Milestone) => void;
}) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const [milestone] = useObject(milestoneRef);
  const target = useResolveRef(milestoneRef);
  const progress = useMemo(() => target && Task.milestoneProgress(tasks, target), [tasks, target]);
  if (!milestone || !target || !progress) {
    return null;
  }

  return (
    <Layout.Flex role='listitem' gap='sm' align='center' classNames='min-w-0'>
      <Icon.Icon icon='ph--flag--regular' valence='info' />
      <span className='truncate'>{milestone.name}</span>
      {milestone.targetDate && <span className='text-fg-subtle shrink-0'>{milestone.targetDate}</span>}
      {progress.total > 0 && (
        <Layout.Flex gap='sm' align='center' classNames='ms-auto shrink-0'>
          <Status.Progress value={progress.ratio} classNames='w-20' />
          <Typography.Text tone='subtle' classNames='tabular-nums'>
            {progress.done}/{progress.total}
          </Typography.Text>
        </Layout.Flex>
      )}
      <Button.Root
        variant='ghost'
        icon='ph--arrow-right--regular'
        iconOnly
        label={t('show-milestone-tasks.label')}
        classNames={progress.total > 0 ? 'shrink-0' : 'ms-auto shrink-0'}
        data-testid='projectsPlugin.milestone.open'
        onClick={() => onOpen(target)}
      />
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
const useCheckedTasks = (taskSet: TaskSet.TaskSet | undefined) => {
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
        get(Obj.atomProperty(task, 'status'));
        get(Obj.atomProperty(task, 'assignee'));
        get(Obj.atomProperty(task, 'delegate'));
        // Milestone progress counts the tasks filed under each milestone.
        get(Obj.atomProperty(task, 'milestone'));
      });
      return Task.orderTree(tasks, get(Obj.atomProperty(taskSet, 'tasks')) ?? []);
    });
  }, [taskSet]);
  const tasks = useAtomValue(atom);

  const checkedTasks = useMemo(() => {
    const checked = new Set(ids);
    return flattenVisibleTasks(buildTaskForest(tasks)).filter((task) => checked.has(task.id));
  }, [ids, tasks]);

  // A row the agent is already working on is left out rather than handed to a second session.
  const delegatableTasks = useMemo(() => checkedTasks.filter((task) => !Task.isAgentWorking(task)), [checkedTasks]);

  // Only the given rows: the others stay checked.
  const uncheck = useCallback(
    (done: readonly Task.Task[]) => {
      const doneIds = new Set(done.map(({ id }) => id));
      multi(ids.filter((id) => !doneIds.has(id)));
    },
    [ids, multi],
  );

  return { tasks, checkedTasks, delegatableTasks, uncheck };
};

export type ToolbarActionsProps = {
  project: Project.Project;
  /** The tab shown, whose tools follow the tabs. */
  tab: ProjectView.Tab;
  /** The view tabs, rendered as the bar's leading item. */
  tabs: ReactNode;
  /** The level's spec picker, view toggle and dialects, shown on the Specs tab. */
  specActions?: ActionGroupBuilderFn;
  /** The checked rows not already with the agent, which the delegate action hands to one chat, in this order. */
  checkedTasks: readonly Task.Task[];
  /** Whether the pipeline chart is shown under the ledger. */
  showPipeline: boolean;
  /** Called once the checked tasks are delegated, so the boxes clear with the work. */
  onDelegated: (tasks: readonly Task.Task[]) => void;
  onTogglePipeline: () => void;
};

/**
 * The toolbar: the tabs, then the shown tab's own tools. Deliberately not spliced from the app graph: toolbar and
 * navtree actions are expected to diverge, and a session with the project is the assistant companion's to start.
 */
const useToolbarActions = ({
  project,
  tab,
  tabs,
  specActions,
  checkedTasks,
  showPipeline,
  onDelegated,
  onTogglePipeline,
}: ToolbarActionsProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  // The handler resolves `Database.Service`, which only the space context supplies — without this
  // the invocation fails with ServiceNotAvailable.
  const spaceId = Obj.getDatabase(project)?.spaceId;

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
        // The spec's tools sit beside the tabs, its editor's own gap pushing view and search to the end.
        .separator(tab === 'spec' ? 'line' : 'gap')
        .subgraph(tab === 'spec' ? specActions : undefined)
        .subgraph(
          tab === 'tasks'
            ? (group) =>
                group
                  // Dead until rows are checked, so a reader who checks some sees it come alive.
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
                          label: [
                            showPipeline ? 'hide-pipeline.label' : 'show-pipeline.label',
                            { ns: ProjectsNamespace.key },
                          ],
                          icon: 'ph--chart-bar-horizontal--regular',
                          testId: 'projectsPlugin.pipeline',
                        },
                        onTogglePipeline,
                      ),
                  )
            : undefined,
        )
        .build(),
    [tab, tabs, delegateTasks, specActions, checkedTasks.length, delegating, showPipeline, onTogglePipeline],
  );
};
