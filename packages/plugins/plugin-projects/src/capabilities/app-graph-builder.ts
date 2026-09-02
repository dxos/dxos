//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { EID, Filter, Obj, Query, Type } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { meta } from '#meta';
import { ProjectOperation } from '#types';

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

    const actionExtensions = yield* createProjectActionExtension();
    const chatExtensions = yield* createProjectChatsExtension();
    const chatChildrenExtensions = yield* createProjectChatsChildrenExtension();
    const artifactsExtensions = yield* createProjectArtifactsExtension();
    const artifactsActionExtensions = yield* createProjectArtifactsActionExtension();
    const mailboxExtensions = yield* createMailboxProjectExtension();
    return Capability.contribute(AppCapabilities.AppGraphBuilder, [
      ...sectionExtensions,
      ...actionExtensions,
      ...chatExtensions,
      ...chatChildrenExtensions,
      ...artifactsExtensions,
      ...artifactsActionExtensions,
      ...mailboxExtensions,
    ]);
  }),
);

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
            label: ['setup-project.label', { ns: meta.profile.key }],
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
export const CHATS_SEGMENT = 'chats';

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
    match: (node) =>
      Obj.instanceOf(Project.Project, node.data)
        ? Option.some({ project: node.data, space: node.properties.space })
        : Option.none(),
    connector: ({ project, space }) =>
      Effect.succeed([
        AppGraphNode.make({
          id: CHATS_SEGMENT,
          type: CHATS_SECTION_TYPE,
          data: { branch: 'chats', project } satisfies ChatsBranch,
          properties: {
            label: ['chats.label', { ns: meta.profile.key }],
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
 * The `chat` url key is shared with plugin-assistant's Chats section on purpose — one key spanning
 * several connectors is how plugin-space addresses objects wherever they sit — so the path resolves
 * through whichever project currently parents the chat.
 */
export const createProjectChatsChildrenExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectChatsChildren',
    match: (node) =>
      node.type === CHATS_SECTION_TYPE && isChatsBranch(node.data) ? Option.some(node.data.project) : Option.none(),
    connector: (project, get) => {
      const db = Obj.getDatabase(project);
      if (!db) {
        return Effect.succeed([]);
      }

      const children = get(db.query(Query.select(Filter.id(project.id)).children()).atom);
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
            label: ['create-chat.label', { ns: meta.profile.key }],
            icon: 'ph--sparkle--regular',
            disposition: 'list-item-primary',
            testId: 'projectsPlugin.createChat',
          },
        }),
      ]),
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
    match: (node) =>
      Obj.instanceOf(Project.Project, node.data)
        ? Option.some({ project: node.data, space: node.properties.space })
        : Option.none(),
    connector: ({ project, space }) =>
      Effect.succeed([
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
            label: ['artifacts.label', { ns: meta.profile.key }],
            icon: 'ph--cube--regular',
            iconHue: 'indigo',
            role: 'branch',
            selectable: true,
            draggable: false,
            droppable: false,
            space,
            testId: 'projectsPlugin.artifactsSection',
          },
        }),
      ]),
  });

/**
 * The Artifacts branch's own children and its `+` action: create an object through the standard
 * create dialog ({@link SpaceOperation.OpenObjectForm}) and link it into `project.artifacts`.
 *
 * The dialog places the object in the space; the ref array is what makes it the project's, so the
 * link is written here rather than left to the dialog's own placement.
 */
export const createProjectArtifactsActionExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'projectArtifactsActions',
    match: (node) =>
      node.type === ARTIFACTS_SECTION_TYPE && isArtifactsBranch(node.data)
        ? Option.some({ project: node.data.project, nodeId: node.id })
        : Option.none(),
    connector: ({ project }, get) => {
      const db = Obj.getDatabase(project);
      if (!db) {
        return Effect.succeed([]);
      }

      // Subscribe to the project itself: the children are its ref array, so a new artifact changes no
      // query this connector would otherwise re-run on.
      get(Obj.atom(project));
      const ids = project.artifacts.flatMap((ref) => {
        const uri = EID.tryParse(ref.uri);
        const entityId = uri && EID.getEntityId(uri);
        return entityId ? [entityId] : [];
      });
      if (ids.length === 0) {
        return Effect.succeed([]);
      }

      // Query rather than read `ref.target`: on a cold load the targets are not in memory yet, and a
      // sync read would leave the branch permanently empty.
      const objects = get(db.query(Query.select(Filter.id(...ids))).atom);
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
                target: db,
                targetNodeId: nodeId,
              });
              // Dismissed dialog: nothing was created, so there is nothing to link.
              if (!ref) {
                return;
              }

              Obj.update(project, (project) => {
                project.artifacts = [...project.artifacts, ref];
              });
            }),
          properties: {
            label: ['create-artifact.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disposition: 'list-item-primary',
            testId: 'projectsPlugin.addArtifact',
          },
        }),
      ]),
  });
