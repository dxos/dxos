//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { SpaceOperation } from '@dxos/plugin-space';

import { meta } from '#meta';
import { ProjectOperation } from '#types';

import { inboxResearch } from '../templates';

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
        Operation.invoke(SpaceOperation.OpenCreateObject, {
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
    const mailboxExtensions = yield* createMailboxProjectExtension();
    return Capability.contribute(AppCapabilities.AppGraphBuilder, [
      ...sectionExtensions,
      ...actionExtensions,
      ...chatExtensions,
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
  GraphBuilder.createExtension({
    id: 'mailboxProjectActions',
    match: (node) =>
      node.properties.systemTag === 'inbox' && Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none(),
    actions: (mailbox) => {
      const db = Obj.getDatabase(mailbox);
      if (!db) {
        return Effect.succeed([]);
      }

      return Effect.succeed([
        Node.makeAction({
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

/**
 * A project's chats as its navtree children. Ownership is the ECHO parent edge (no `Project` schema
 * field), so the enumeration is a hierarchy query rather than a ref-array read; the `TypeSection`
 * extension that emits Project nodes leaves them childless.
 *
 * The `chat` url key is shared with plugin-assistant's Chats section on purpose — one key spanning
 * several connectors is how plugin-space addresses objects wherever they sit — so the path resolves
 * through whichever project currently parents the chat.
 */
export const createProjectChatsExtension = () =>
  GraphBuilder.createExtension({
    id: 'projectChats',
    match: (node) => (Obj.instanceOf(Project.Project, node.data) ? Option.some(node.data) : Option.none()),
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
  GraphBuilder.createExtension({
    id: 'projectActions',
    match: (node) => (Obj.instanceOf(Project.Project, node.data) ? Option.some(node.data) : Option.none()),
    actions: (project) =>
      Effect.succeed([
        Node.makeAction({
          id: ProjectOperation.CreateChat.meta.key,
          data: () =>
            Effect.gen(function* () {
              const db = Obj.getDatabase(project);
              if (!db) {
                return;
              }

              yield* Operation.invoke(ProjectOperation.CreateChat, { project }, { spaceId: db.spaceId });
            }),
          properties: {
            label: ['create-chat.label', { ns: meta.profile.key }],
            icon: 'ph--chat-text--regular',
            disposition: 'list-item-primary',
            testId: 'projectsPlugin.createChat',
          },
        }),
      ]),
  });
