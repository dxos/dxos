//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as Node from '@dxos/app-graph/Node';
import * as NodeMatcher from '@dxos/app-graph/NodeMatcher';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import { Chat, RunInstructions } from '@dxos/assistant-toolkit';
import { isSpace } from '@dxos/client/echo';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Sequence } from '@dxos/conductor';
import { Database, DXN, Filter, Obj, Query, type Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Attention } from '@dxos/react-ui-attention';
import { Position } from '@dxos/util';

import { ASSISTANT_COMPANION_VARIANT, meta } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';

/** Operation definitions to seed as `PersistentOperation` records for automation / triggers. */
const computeOperationsToImport = [RunInstructions] as const;

/**
 * Chats belonging to the top-level Chats section: every chat minus the two kinds that already appear
 * elsewhere in the tree. A chat sourcing a `CompanionTo` relation belongs to its primary object's
 * companion panel; a chat parented to a `Project` is that project's navtree child (plugin-projects
 * `projectChats`). Without the second exclusion a project chat appears twice.
 *
 * The project exclusion subtracts every project child rather than just chats — `children()` takes no
 * type filter, and subtracting a non-chat from a chat-typed source is a no-op.
 */
export const standaloneChatsQuery = Query.without(
  Query.without(
    Query.select(Filter.type(Chat.Chat)),
    Query.select(Filter.type(Chat.Chat)).sourceOf(Chat.CompanionTo).source(),
  ),
  Query.select(Filter.type(Project.Project)).children(),
);

/** Match ECHO objects that are NOT chats. */
const whenNonChatObject = NodeMatcher.whenAll(
  NodeMatcher.whenEchoObject,
  NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(Chat.Chat)),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read through their atoms so the "companionChat" extension establishes a reactive dependency
    // and re-evaluates once these capabilities land (dependency modules contribute individually,
    // not batched per wave) or their values change.
    const stateCapabilityAtom = yield* Capability.atom(AssistantCapabilities.State);
    const cacheCapabilityAtom = yield* Capability.atom(AssistantCapabilities.CompanionChatCache);

    const extensions = yield* Effect.all([
      // AI section group — created here so it shows only when the assistant plugin is active.
      GraphBuilder.createExtension({
        id: GraphPath.GroupSegments.ai,
        match: AppNodeMatcher.whenSpace,
        connector: (space) =>
          Effect.succeed([
            AppNode.makeGroup({
              id: GraphPath.GroupSegments.ai,
              type: GraphPath.GroupTypes.ai,
              label: ['nav-tree-group-ai.label', { ns: meta.profile.key }],
              space,
              position: 300,
            }),
          ]),
      }),

      GraphBuilder.createTypeExtension({
        id: 'root',
        type: Chat.Chat,
        actions: (chat) => {
          return Effect.succeed([
            Node.makeAction({
              id: AssistantOperation.UpdateChatName.meta.key,
              data: () =>
                Effect.gen(function* () {
                  // TODO(dmaretskyi): This goes away when composer will have unified operation invocations.
                  const db = Obj.getDatabase(chat);
                  invariant(db);
                  yield* Operation.invoke(AssistantOperation.UpdateChatName, { chat }, { spaceId: db.spaceId });
                }),
              properties: {
                label: ['chat-update-name.label', { ns: meta.profile.key }],
                icon: 'ph--magic-wand--regular',
                disposition: 'list-item',
              },
            }),
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: 'assistant',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            Node.makeAction({
              id: 'importComputeOperations',
              data: Effect.fnUntraced(function* () {
                const capabilities = yield* Capability.Service;
                const client = yield* Capability.get(ClientCapabilities.Client);
                const space = AppSpace.getActiveSpace(client, capabilities) ?? AppSpace.getDefaultSpace(client);
                if (!space) {
                  return;
                }
                for (const definition of computeOperationsToImport) {
                  const key = definition.meta.key;
                  if (!key) {
                    continue;
                  }
                  const existing = yield* Effect.promise((): Promise<Operation.PersistentOperation[]> =>
                    space.db.query(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(key))).run(),
                  );
                  if (existing.length === 0) {
                    space.db.add(Operation.serialize(definition));
                  }
                }
                yield* Database.flush();
              }),
              properties: {
                label: ['import-compute-operations.label', { ns: meta.profile.key }],
                icon: 'ph--download-simple--regular',
              },
            }),
            Node.makeAction({
              id: AssistantOperation.SetTracePanelDebug.meta.key,
              // The menu item flips, so it reads the current value and states the one it wants.
              data: () =>
                Effect.gen(function* () {
                  const settings = yield* Capabilities.getAtomValue(AssistantCapabilities.Settings);
                  yield* Operation.invoke(AssistantOperation.SetTracePanelDebug, {
                    state: !settings.tracePanelDebug,
                  });
                }),
              properties: {
                label: ['set-trace-panel-debug.label', { ns: meta.profile.key }],
                icon: 'ph--brackets-curly--regular',
              },
            }),
          ]),
      }),

      // Don't show assistant companion when a chat is already the primary object.
      GraphBuilder.createExtension({
        id: 'companionChat',
        match: whenNonChatObject,
        connector: (object, get) =>
          Effect.gen(function* () {
            const [stateAtom] = get(stateCapabilityAtom);
            const [cacheAtom] = get(cacheCapabilityAtom);
            if (!stateAtom || !cacheAtom) {
              return [];
            }
            const state = get(stateAtom);
            const cache = get(cacheAtom);
            const objectUri = Obj.getURI(object);

            // Resolve chat from persisted state or transient cache.
            const chat = pipe(
              Option.fromNullishOr(state.currentChat[objectUri]),
              Option.flatMap((dxnStr) => Option.fromNullishOr(DXN.tryMake(dxnStr))),
              Option.flatMap((dxn) => Option.fromNullishOr(Obj.getDatabase(object)?.makeRef(dxn))),
              Option.map((ref) => get(Obj.atom(ref as Ref.Ref<Obj.Unknown>))),
              Option.filter(Obj.isObject),
              Option.orElse(() => pipe(Option.fromNullishOr(cache[objectUri]), Option.filter(Obj.isObject))),
              Option.getOrNull,
            );

            return [
              AppNode.makeCompanion({
                variant: ASSISTANT_COMPANION_VARIANT,
                label: ['assistant-chat.label', { ns: meta.profile.key }],
                icon: 'ph--sparkle--regular',
                data: chat,
                position: Position.first,
              }),
            ];
          }).pipe(Effect.orDie),
      }),

      GraphBuilder.createExtension({
        id: 'invocations',
        match: NodeMatcher.whenAny(
          NodeMatcher.whenEchoTypeMatches(Sequence.Sequence),
          NodeMatcher.whenEchoTypeMatches(Instructions.Instructions),
        ),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'invocations',
              label: ['invocations.label', { ns: meta.profile.key }],
              icon: 'ph--clock-countdown--regular',
              data: 'invocations',
            }),
          ]),
      }),

      GraphBuilder.createExtension({
        id: 'trace',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: Attention.linkedSegment('trace'),
              label: ['trace.label', { ns: meta.profile.key }],
              icon: 'ph--line-segments--regular',
              data: 'trace',
              position: Position.last,
            }),
          ]),
      }),

      // Section node: standalone Chat.Chat objects per AI group (companions and project chats excluded).
      TypeSection.createTypeSectionExtension(Chat.Chat, {
        query: standaloneChatsQuery,
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
        groupSegment: GraphPath.GroupSegments.ai,
        urlKey: 'chat',
      }),

      // Create-chat action on the Chats section header.
      GraphBuilder.createExtension({
        id: 'chatsSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === Type.getTypename(Chat.Chat) && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-chat',
              data: () =>
                Effect.gen(function* () {
                  const { object: chat } = yield* Operation.invoke(
                    AssistantOperation.CreateChat,
                    { db: space.db },
                    { spaceId: space.db.spaceId },
                  );
                  yield* Operation.invoke(SpaceOperation.AddObject, { object: chat }, { spaceId: space.db.spaceId });
                  const { targets } = yield* Operation.invoke(
                    NavigationOperation.ResolveNavigationTargets,
                    { query: { uri: Obj.getURI(chat) } },
                    { spaceId: space.db.spaceId },
                  );
                  const navigationTarget = targets[0];
                  if (navigationTarget) {
                    yield* Operation.invoke(
                      LayoutOperation.Open,
                      { subject: [navigationTarget.path] },
                      { spaceId: space.db.spaceId },
                    );
                  }
                }),
              properties: {
                label: ['create-chat.label', { ns: meta.profile.key }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
