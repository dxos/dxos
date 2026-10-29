//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { ArchivedAnnotation } from '@dxos/schema';
import { Task } from '@dxos/types';

import { Feature, ProjectOperation, Spec } from '#types';

import { FEATURE_COMPANION } from '../constants.ts';
import { ProjectsNamespace } from '../namespace.ts';
import { refId } from '../operations/feature/util.ts';
import { inboxResearch } from '../templates/index.ts';

/**
 * Surfaces all `Project` objects in a space as a sidebar section nested under the assistant (AI) group —
 * a section root node plus a child per `Project`, each opening via the regular object/article surface
 * (`ProjectArticle`). The section's label and icon derive from the `Project` schema annotations; it is
 * suppressed when the space has no projects. The header `+` action creates a new Project (via the
 * `CreateObject` capability). Nesting under the AI group means the section only appears when the
 * assistant plugin is active (it owns the group node).
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const sectionExtensions = yield* TypeSection.createTypeSectionExtension(Project.Project, {
      urlKey: 'project',
      match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
      groupSegment: GraphPath.GroupSegments.ai,
      dropInto: artifacts,
      createObject: (space) =>
        Operation.invoke(SpaceOperation.OpenObjectForm, {
          target: space.db,
          typename: Type.getTypename(Project.Project),
          targetNodeId: GraphPath.getSpacePath(
            space.db.spaceId,
            GraphPath.GroupSegments.ai,
            Type.getTypename(Project.Project),
          ),
        }),
    });

    /**
     * @deprecated Specs are reached through the project that owns them (its Spec tab), not a section of their own.
     * Kept until a follow-up removes it with {@link createSpecBreakdownsExtension}.
     */
    const specSectionExtensions = yield* TypeSection.createTypeSectionExtension(Spec.Spec, {
      urlKey: 'features',
      match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
      groupSegment: GraphPath.GroupSegments.ai,
      createObject: (space) =>
        Operation.invoke(SpaceOperation.OpenObjectForm, {
          target: space.db,
          typename: Type.getTypename(Spec.Spec),
          targetNodeId: GraphPath.getSpacePath(
            space.db.spaceId,
            GraphPath.GroupSegments.ai,
            Type.getTypename(Spec.Spec),
          ),
        }),
    });
    const specBreakdownExtensions = yield* createSpecBreakdownsExtension();
    const actionExtensions = yield* createProjectActionExtension();
    const chatExtensions = yield* createProjectChatsExtension();
    const chatChildrenExtensions = yield* createProjectChatsChildrenExtension();
    const artifactsExtensions = yield* createProjectArtifactsExtension();
    const artifactsActionExtensions = yield* createProjectArtifactsActionExtension();
    const taskExtensions = yield* createProjectTasksExtension();
    const mailboxExtensions = yield* createMailboxProjectExtension();
    const specExtensions = yield* createProjectSpecExtension();
    // The feature companion: the feature selected on the spec's map, beside the spec plank.
    const featureCompanionExtensions = yield* AppGraphBuilder.createTypeExtension({
      id: 'featureCompanion',
      relation: AppNode.companion,
      type: Spec.Spec,
      connector: () => Effect.succeed([makeFeatureCompanion()]),
    });
    // The same companion beside a project, while it owns a spec: the project's Spec tab shows that spec's map.
    const projectFeatureCompanionExtensions = yield* AppGraphBuilder.createTypeExtension({
      id: 'projectFeatureCompanion',
      relation: AppNode.companion,
      type: Project.Project,
      connector: (project, get) => {
        const specRef = get(Obj.atom(project)).spec;
        const spec = specRef && get(Obj.atomReactive(specRef));
        return Effect.succeed(Spec.instanceOf(spec) ? [makeFeatureCompanion()] : []);
      },
    });
    return Capability.contribute(AppCapabilities.AppGraphBuilder, [
      ...sectionExtensions,
      ...specSectionExtensions,
      ...specBreakdownExtensions,
      ...actionExtensions,
      // First of the project's branches: the spec is what its work delivers.
      ...specExtensions,
      ...chatExtensions,
      ...chatChildrenExtensions,
      ...artifactsExtensions,
      ...artifactsActionExtensions,
      ...taskExtensions,
      ...mailboxExtensions,
      ...featureCompanionExtensions,
      ...projectFeatureCompanionExtensions,
    ]);
  }),
);

/**
 * One URL binding for a spec and the specs nested beneath it, shared with the Specs type section, so
 * `features/<id>+<nested>+<nested>` reconstructs the chain the way {@link PROJECT_URL} does for a project.
 */
const SPEC_URL: AppGraphBuilder.UrlBinding = {
  key: 'features',
  kind: 'item',
  path: [GraphPath.GroupSegments.ai, Type.getTypename(Spec.Spec)],
};

/**
 * The specs that break down a spec's features, as its children in the navtree, in the order of the features they
 * break down. Each child is itself a spec, so this extension matches it too and the tree nests to any depth.
 *
 * @deprecated Serves the top-level Specs section, which is going away; a project's Spec tab zooms into breakdowns.
 */
export const createSpecBreakdownsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'specBreakdowns',
    url: SPEC_URL,
    match: (node) => (Spec.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
    connector: (spec, get) => {
      const db = Obj.getDatabase(spec);
      if (!db) {
        return Effect.succeed([]);
      }

      const order = get(Obj.atom(spec)).features.map(refId);
      const nested = get(db.query(Filter.type(Spec.Spec)).atom)
        .map((child) => ({ child, owner: Spec.getOwner(child) }))
        .flatMap(({ child, owner }) =>
          owner && Spec.getContainer(owner)?.id === spec.id
            ? [{ child, index: order.findIndex((id) => id === owner.id) }]
            : [],
        )
        .sort((left, right) => left.index - right.index);
      return Effect.succeed(
        nested
          .map(({ child }) => AppNode.makeObject({ get, db, object: child, navigable: true }))
          .filter((node): node is NonNullable<typeof node> => node !== null),
      );
    },
  });

/**
 * "Set up project" on the primary mailbox node (`systemTag: 'inbox'`, so it appears once, not on
 * every sibling filter view): creates an Inbox Research project pre-wired to the mailbox (standing
 * context, inbox/table skills, starter sender-ledger routine) and opens it. Lives here rather than
 * in plugin-inbox because the template does (see `templates/index.ts` on the public/private
 * dependency direction); injecting actions into another plugin's nodes is the established pattern
 * (e.g. plugin-brain's mailbox Analyze action).
 */
export const createMailboxProjectExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'mailboxProjectActions',
    match: (node) =>
      node.properties.systemTag === 'inbox' && Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none(),
    actions: (mailbox) => {
      const db = Obj.getDatabase(mailbox);
      if (!db) {
        return Effect.succeed([]);
      }

      return Effect.succeed([
        AppGraphNode.makeAction({
          id: 'setupProject',
          data: () =>
            Effect.gen(function* () {
              const { subject } = yield* Operation.invoke(
                ProjectOperation.Create,
                { templateId: inboxResearch.id, subject: mailbox },
                { spaceId: db.spaceId },
              );
              yield* Operation.invoke(LayoutOperation.Open, { subject: [...subject] });
            }),
          properties: {
            label: ['setup-project.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--stack-plus--regular',
            disposition: 'list-item',
            testId: 'projectsPlugin.setupProject',
          },
        }),
      ]);
    },
  });

/** Node `type` of a project's virtual Chats branch; the child extension below matches on it. */
export const CHATS_SECTION_TYPE = 'org.dxos.plugin.projects.chats-section';

/** Path segment of the Chats branch. */
export const SESSIONS_SEGMENT = 'sessions';

/**
 * One URL binding for everything a project contains, shared with the type section that addresses the
 * project itself — so `project/<id>` is the project, `project/<id>+sessions` its Sessions branch, and
 * `project/<id>+sessions+<session>` a session. The path is fixed only as far as the Project section;
 * what varies below it rides in the pair's id, `+`-joined, and the chain reconstructs with no lookup.
 * Every extension under the key must share this one path, or a node's address forks by connector.
 */
const PROJECT_URL: AppGraphBuilder.UrlBinding = {
  key: 'project',
  kind: 'item',
  path: [GraphPath.GroupSegments.ai, Type.getTypename(Project.Project)],
};

/**
 * Data carried by the Chats branch node. Wrapped so no Project-matching extension claims it, and
 * tagged because the Artifacts branch wraps a project the same way — without the tag a surface
 * matching on the shape alone renders whichever branch it saw first for both.
 */
export type ChatsBranch = { branch: 'chats'; project: Project.Project };

export const isChatsBranch = (data: unknown): data is ChatsBranch =>
  typeof data === 'object' &&
  data !== null &&
  (data as ChatsBranch).branch === 'chats' &&
  Obj.instanceOf(Project.Project, (data as ChatsBranch).project);

/**
 * A virtual "Chats" branch under each project's navtree row, mirroring the Artifacts branch beside
 * it — a project accumulates conversations, and flat under the project row they crowded out
 * everything else it owns.
 *
 * Virtual for the same reason Artifacts is: the branch stands for no ECHO object, so it carries the
 * project as wrapped `data` and {@link createProjectChatsChildrenExtension} matches on that.
 */
export const createProjectChatsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectChats',
    // Selectable, so addressable: the row opens its chats as cards.
    url: PROJECT_URL,
    match: (node) =>
      Obj.instanceOf(Project.Project, node.data)
        ? Option.some({ project: node.data, space: node.properties.space })
        : Option.none(),
    connector: ({ project, space }) =>
      Effect.succeed([
        AppGraphNode.make({
          id: SESSIONS_SEGMENT,
          type: CHATS_SECTION_TYPE,
          data: { branch: 'chats', project } satisfies ChatsBranch,
          properties: {
            label: ['chats.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--sparkle--regular',
            iconHue: 'amber',
            role: 'branch',
            // Selecting the branch opens its objects as cards (see `ProjectChatsArticle`), the way
            // a database type node does; expanding it still lists them in the tree.
            selectable: true,
            draggable: false,
            droppable: false,
            space,
            testId: 'projectsPlugin.chatsSection',
          },
        }),
      ]),
  });

/**
 * The Chats branch's children. Ownership is the ECHO parent edge (no `Project` schema field) — the
 * same edge every companion chat uses — so what is project-specific is only the DISPLAY: project
 * chats surface in the navtree, other companions stay in their subject's companion panel.
 *
 * Addressed as the project's (see {@link PROJECT_URL}), not under plugin-assistant's `chat` key,
 * which reaches a parentless chat by a different path.
 */
export const createProjectChatsChildrenExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectChatsChildren',
    url: PROJECT_URL,
    match: (node) =>
      node.type === CHATS_SECTION_TYPE && isChatsBranch(node.data) ? Option.some(node.data.project) : Option.none(),
    connector: (project, get) => {
      const db = Obj.getDatabase(project);
      if (!db) {
        return Effect.succeed([]);
      }

      const children = get(
        db.query(
          Query.select(Filter.id(project.id))
            .children()
            .select(Filter.not(Filter.annotation(ArchivedAnnotation, true))),
        ).atom,
      );
      return Effect.succeed(
        children
          .filter(Obj.instanceOf(Chat.Chat))
          .map((chat) => AppNode.makeObject({ get, db, object: chat, navigable: true }))
          // `makeObject` yields null for an object it cannot resolve a node for.
          .filter((node): node is NonNullable<typeof node> => node !== null),
      );
    },
  });

/**
 * Every task in the project's set as a hidden child of the project node, so `…/project/<id>/<taskId>`
 * resolves and a row can open the task as its own plank. Hidden because the ledger is the Tasks tab,
 * not the nav tree — the nodes exist to be addressed, never listed.
 *
 * The node's data is the `Task` object itself, so it picks up the standard object companions and the
 * `TaskArticle` surface matches it like any other object.
 */
export const createProjectTasksExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectTasks',
    url: PROJECT_URL,
    // Under every spec level too, so a level's Tasks tab opens a row the way the project's does.
    match: (node) =>
      Obj.instanceOf(Project.Project, node.data)
        ? Option.some(node.data)
        : Option.map(matchSpecLevel(node), ({ project }) => project),
    connector: (project, get) => {
      const db = Obj.getDatabase(project);
      const taskSet = project.taskSet && get(project.taskSet.atom);
      if (!db || !taskSet) {
        return Effect.succeed([]);
      }

      // Membership is the parent edge (the set's `tasks` array only orders it), matching how
      // `TaskSetArticle` reads the same rows.
      const tasks = get(db.query(Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet))).atom);
      return Effect.succeed(
        tasks
          .map((task) => AppNode.makeObject({ get, db, object: task, disposition: 'hidden' }))
          .filter((node): node is NonNullable<typeof node> => node !== null),
      );
    },
  });

/**
 * Start a chat in project scope, on the project's navtree row. The `ProjectArticle` toolbar owns its
 * own create-chat button rather than sharing this one — the two surfaces are expected to diverge as
 * the toolbar grows, and a shared `toolbar` disposition here would double up with it.
 */
export const createProjectActionExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectActions',
    match: (node) => (Obj.instanceOf(Project.Project, node.data) ? Option.some(node.data) : Option.none()),
    actions: (project) =>
      Effect.succeed([
        AppGraphNode.makeAction({
          id: AssistantOperation.CreateChat.meta.key,
          data: () =>
            Effect.gen(function* () {
              const db = Obj.getDatabase(project);
              if (!db) {
                return;
              }

              const spaceId = db.spaceId;
              const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {}, { spaceId });
              // Parent edge before the add: it files the chat under the project, not the space root.
              Chat.linkCompanion({ chat, subject: project });
              yield* Operation.invoke(SpaceOperation.AddObject, { object: chat }, { spaceId });
              yield* Operation.invoke(AssistantOperation.SetCurrentChat, { companionTo: project, chat }, { spaceId });
            }),
          properties: {
            label: ['create-chat.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--sparkle--regular',
            disposition: 'list-item-primary',
            testId: 'projectsPlugin.createChat',
          },
        }),
      ]),
  });

/** Node `type` of a project's Spec branch and of every feature level beneath it. */
export const SPEC_LEVEL_TYPE = 'org.dxos.plugin.projects.spec-level';

/** Path segment (and node id) of the Spec branch under its project. */
export const SPEC_SEGMENT = 'spec';

/**
 * Data carried by a spec level's node: the project, and the feature whose breakdown the level is (none for the
 * project's own spec). Wrapped for the reason {@link ChatsBranch} is.
 */
export type SpecLevel = { branch: 'spec'; project: Project.Project; feature?: Feature.Feature };

export const isSpecLevel = (data: unknown): data is SpecLevel =>
  typeof data === 'object' &&
  data !== null &&
  (data as SpecLevel).branch === 'spec' &&
  Obj.instanceOf(Project.Project, (data as SpecLevel).project) &&
  ((data as SpecLevel).feature === undefined || Feature.instanceOf((data as SpecLevel).feature));

const matchSpecLevel = (node: AppGraphNode.Node): Option.Option<SpecLevel & { space: unknown }> =>
  node.type === SPEC_LEVEL_TYPE && isSpecLevel(node.data)
    ? Option.some({ ...node.data, space: node.properties.space })
    : Option.none();

/** The spec a level shows: the project's own, or the one breaking the level's feature down. */
const getLevelSpec = ({ project, feature }: SpecLevel, get: Atom.AtomContext): Spec.Spec | undefined => {
  const specRef = feature ? get(Obj.atom(feature)).spec : get(Obj.atom(project)).spec;
  const spec = specRef && get(Obj.atomReactive(specRef));
  return Spec.instanceOf(spec) ? spec : undefined;
};

const makeSpecLevelNode = (
  level: SpecLevel,
  space: unknown,
  { id, label, icon }: { id: string; label: string | [string, { ns: string }]; icon: string },
) =>
  AppGraphNode.make({
    id,
    type: SPEC_LEVEL_TYPE,
    data: level,
    properties: {
      label,
      icon,
      iconHue: 'amber',
      role: 'branch',
      // Selecting a feature opens the project at that depth (see `ProjectArticle`), on the tab the reader was on. The
      // Spec branch only groups them: the project's own spec is its project node's Spec tab.
      selectable: level.feature !== undefined,
      draggable: false,
      droppable: false,
      space,
      testId: 'projectsPlugin.specLevel',
    },
  });

/**
 * The project's spec as a Spec branch beside Sessions and Artifacts, its features nested beneath it to any depth. Every
 * level is a node of its own, so `…/project/<id>/spec/<feature>/<subfeature>` addresses one depth of the project and
 * the deck's ancestor breadcrumbs trail back up through it.
 */
export const createProjectSpecExtension = () =>
  Effect.all([
    AppGraphBuilder.createExtension({
      id: 'projectSpec',
      url: PROJECT_URL,
      match: (node) =>
        Obj.instanceOf(Project.Project, node.data)
          ? Option.some({ project: node.data, space: node.properties.space })
          : Option.none(),
      connector: ({ project, space }) =>
        Effect.succeed([
          makeSpecLevelNode({ branch: 'spec', project }, space, {
            id: SPEC_SEGMENT,
            label: ['spec.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--blueprint--regular',
          }),
        ]),
    }),
    AppGraphBuilder.createExtension({
      id: 'projectSpecFeatures',
      url: PROJECT_URL,
      match: matchSpecLevel,
      connector: ({ space, ...level }, get) => {
        const spec = getLevelSpec(level, get);
        if (!spec) {
          return Effect.succeed([]);
        }

        // In the map's order: by name.
        const features = get(Obj.atomReactive(get(Obj.atom(spec)).features))
          .filter(Feature.instanceOf)
          .map((feature) => ({ feature, name: get(Obj.atom(feature)).name }))
          .sort((left, right) => left.name.localeCompare(right.name));
        return Effect.succeed(
          features.map(({ feature, name }) =>
            makeSpecLevelNode({ branch: 'spec', project: level.project, feature }, space, {
              id: feature.id,
              label: name,
              icon: 'ph--puzzle-piece--regular',
            }),
          ),
        );
      },
    }),
    // The feature companion beside every level that has a map to select from.
    AppGraphBuilder.createExtension({
      id: 'specLevelFeatureCompanion',
      relation: AppNode.companion,
      match: matchSpecLevel,
      connector: ({ space: _, ...level }, get) =>
        Effect.succeed(getLevelSpec(level, get) ? [makeFeatureCompanion()] : []),
    }),
  ]).pipe(Effect.map((extensions) => extensions.flat()));

const makeFeatureCompanion = () =>
  AppNode.makeCompanion({
    variant: FEATURE_COMPANION,
    label: ['feature-companion.label', { ns: ProjectsNamespace.key }],
    icon: 'ph--puzzle-piece--regular',
    data: FEATURE_COMPANION,
  });

export const artifacts = (project: Project.Project): ContainerModel.Container =>
  ContainerModel.make(project, 'artifacts', {
    removeLabel: ['remove-from-project.label', { ns: ProjectsNamespace.key }],
  });

/** Node `type` of a project's virtual Artifacts branch; the two extensions below match on it. */
export const ARTIFACTS_SECTION_TYPE = 'org.dxos.plugin.projects.artifacts-section';

/** Path segment (and node id) of that branch under its project. */
export const ARTIFACTS_SEGMENT = 'artifacts';

/** Data carried by the Artifacts branch node; tagged for the reason {@link ChatsBranch} is. */
export type ArtifactsBranch = { branch: 'artifacts'; project: Project.Project };

export const isArtifactsBranch = (data: unknown): data is ArtifactsBranch =>
  typeof data === 'object' &&
  data !== null &&
  (data as ArtifactsBranch).branch === 'artifacts' &&
  Obj.instanceOf(Project.Project, (data as ArtifactsBranch).project);

/**
 * A virtual "Artifacts" branch under each project's navtree row, mirroring the Artifacts section of
 * `ProjectArticle`. Virtual because a project's artifacts are a ref array on the project itself, not
 * a collection — there is no ECHO object for the branch to stand for, so it carries the project as
 * its `data` and {@link createProjectArtifactsActionExtension} matches on that.
 *
 * Separate from {@link createProjectChatsExtension}: both connect children to a project node and the
 * graph merges them, but chats are ECHO children while artifacts hang off the ref array.
 */
export const createProjectArtifactsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectArtifacts',
    // Selectable, so addressable: the row opens its artifacts as cards.
    url: PROJECT_URL,
    match: (node) =>
      Obj.instanceOf(Project.Project, node.data)
        ? Option.some({ project: node.data, space: node.properties.space })
        : Option.none(),
    connector: ({ project, space }) => {
      const db = Obj.getDatabase(project);
      return Effect.succeed([
        // Built inline rather than via `AppNode.makeSection`: that helper takes a typed `Space`, which
        // would pull @dxos/client into this plugin's dependencies for a value it only passes through.
        AppGraphNode.make({
          id: ARTIFACTS_SEGMENT,
          type: ARTIFACTS_SECTION_TYPE,
          // Wrapped, not the bare project: every Project-matching extension here (chats, actions,
          // and this one) keys off `Obj.instanceOf(Project)`, so a branch carrying the project as its
          // own data matched them all — it grew its own Artifacts child, forever. The wrapper is
          // matched only by {@link createProjectArtifactsActionExtension}.
          data: { branch: 'artifacts', project } satisfies ArtifactsBranch,
          properties: {
            label: ['artifacts.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--cube--regular',
            iconHue: 'amber',
            role: 'branch',
            selectable: true,
            draggable: false,
            droppable: false,
            space,
            testId: 'projectsPlugin.artifactsSection',
            ...(db ? AppNode.getListPartials(artifacts(project), db) : {}),
          },
        }),
      ]);
    },
  });

/**
 * The Artifacts branch's own children and its `+` action: create an object through the standard
 * create dialog ({@link SpaceOperation.OpenObjectForm}) and link it into `project.artifacts`.
 *
 * The dialog places the object in the space; the ref array is what makes it the project's, so the
 * link is written here rather than left to the dialog's own placement.
 *
 * Addressed as the project's (see {@link PROJECT_URL}), which is a different node from the same object
 * under its own type section, so an artifact opened from a project comes back to the project.
 */
export const createProjectArtifactsActionExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectArtifactsActions',
    url: PROJECT_URL,
    match: (node) =>
      node.type === ARTIFACTS_SECTION_TYPE && isArtifactsBranch(node.data)
        ? Option.some({ project: node.data.project, nodeId: node.id })
        : Option.none(),
    connector: ({ project }, get) => {
      const db = Obj.getDatabase(project);
      if (!db) {
        return Effect.succeed([]);
      }

      const objects = get(db.query(Query.select(Filter.entity(project)).reference('artifacts')).atom);
      return Effect.succeed(
        objects
          .map((object) => AppNode.makeObject({ get, db, object, navigable: true }))
          .filter((node): node is NonNullable<typeof node> => node !== null),
      );
    },
    actions: ({ project, nodeId }) =>
      Effect.succeed([
        AppGraphNode.makeAction({
          id: SpaceOperation.OpenObjectForm.meta.key,
          data: () =>
            Effect.gen(function* () {
              const db = Obj.getDatabase(project);
              if (!db) {
                return;
              }

              const ref = yield* Operation.invoke(SpaceOperation.OpenObjectForm, {
                target: project,
                targetNodeId: nodeId,
              });
              // Dismissed dialog: nothing was created, so there is nothing to link.
              if (!ref) {
                return;
              }

              Obj.update(project, (project) => {
                project.artifacts.push(ref);
              });
            }),
          properties: {
            label: ['create-artifact.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--plus--regular',
            disposition: 'list-item-primary',
            testId: 'projectsPlugin.addArtifact',
          },
        }),
      ]),
  });
