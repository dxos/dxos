//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as CreateAtom from '@dxos/app-graph/CreateAtom';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Space, isSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Obj } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';
import { Attention } from '@dxos/react-ui-attention/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { HelpCapabilities, HelpOperation, SupportCapabilities } from '#types';

import { WelcomeDismissedAnnotation } from '../annotations';
import { SHORTCUTS_DIALOG } from '../constants';

// Graph node/action label tuples. These MUST be module-level singletons: connectors/actions re-evaluate
// whenever their matched node emits, and `addNodeImpl` dedupes properties by reference. A label tuple
// rebuilt inline on every evaluation always compares unequal, so the graph re-emits the node, remounting
// the node's surface (and any cross-origin iframe it hosts) and freezing the app.
type LabelTuple = [string, { ns: string }];
const OPEN_HELP_TOUR_LABEL: LabelTuple = ['open-help-tour.message', { ns: meta.profile.key }];
const OPEN_SHORTCUTS_LABEL: LabelTuple = ['open-shortcuts.label', { ns: meta.profile.key }];
const HELP_COMPANION_LABEL: LabelTuple = ['help-companion.label', { ns: meta.profile.key }];
const HELP_LABEL: LabelTuple = ['help.label', { ns: meta.profile.key }];
const DISCORD_LABEL: LabelTuple = ['discord.label', { ns: meta.profile.key }];
const START_TOUR_LABEL: LabelTuple = ['start-tour.button', { ns: meta.profile.key }];
const HIDE_WELCOME_LABEL: LabelTuple = ['hide-welcome.button', { ns: meta.profile.key }];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read the settings through their atom so the "discord" extension establishes a reactive
    // dependency and re-evaluates when the setting changes or the capability lands (dependency
    // modules contribute individually, not batched per wave).
    const settingsCapabilityAtom = yield* Capability.atom(SupportCapabilities.Settings);
    // Hoisted so the Home toolbar actions re-evaluate once the client (and with it the settings
    // space holding the dismissed flag) lands.
    const clientCapabilityAtom = yield* Capability.atom(ClientCapabilities.Client);

    const extensions = yield* Effect.all([
      // Root actions: open welcome tour + open shortcuts.
      AppGraphBuilder.createExtension({
        id: 'root',
        match: GraphNodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            AppGraphNode.makeAction({
              id: HelpOperation.Start.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Capabilities.updateAtomValue(HelpCapabilities.State, (s) => ({ ...s, showHints: true }));
                yield* Operation.invoke(HelpOperation.Start);
              }),
              properties: {
                label: OPEN_HELP_TOUR_LABEL,
                icon: 'ph--info--regular',
                keyBinding: {
                  macos: 'shift+meta+/',
                  windows: 'shift+ctrl+/',
                  linux: 'shift+ctrl+?',
                },
                testId: 'helpPlugin.openHelp',
              },
            }),
            AppGraphNode.makeAction({
              id: 'openShortcuts',
              data: Effect.fnUntraced(function* () {
                yield* Capabilities.updateAtomValue(HelpCapabilities.State, (s) => ({ ...s, showHints: true }));
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: SHORTCUTS_DIALOG,
                });
              }),
              properties: {
                label: OPEN_SHORTCUTS_LABEL,
                icon: 'ph--keyboard--regular',
                keyBinding: {
                  macos: 'meta+ctrl+/',
                },
              },
            }),
          ]),
      }),

      // Plank companion: contributes a "Help" panel for every ECHO object
      // article. The panel surface (`help-companion` in react-surface)
      // renders the owning plugin's `meta.description`.
      AppGraphBuilder.createExtension({
        id: 'helpCompanion',
        match: AppNodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'help',
              label: HELP_COMPANION_LABEL,
              icon: 'ph--info--regular',
              data: 'help',
              position: Position.last,
            }),
          ]),
      }),

      // Deck companion: feedback / help tab in the complementary sidebar (R1).
      // Renders the FeedbackPanel via the `deck-companion--help` surface.
      AppGraphBuilder.createExtension({
        id: 'help',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: Attention.linkedSegment('help'),
              label: HELP_LABEL,
              icon: 'ph--megaphone--regular',
              data: null,
              position: Position.first,
              joyride: 'welcome/feedback',
            }),
          ]),
      }),

      // Deck companion: Discord community tab in the complementary sidebar (R1).
      // Renders the Discord widget iframe via the `deck-companion--discord` surface.
      // Hidden by default; toggled via the showDiscordCompanion setting.
      AppGraphBuilder.createExtension({
        id: 'discord',
        match: GraphNodeMatcher.whenRoot,
        connector: (_root, get) => {
          const [settingsAtom] = get(settingsCapabilityAtom);
          if (!settingsAtom) {
            return Effect.succeed([]);
          }
          const settings = get(settingsAtom);
          if (!settings.showDiscordCompanion) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            AppNode.makeDeckCompanion({
              id: Attention.linkedSegment('discord'),
              label: DISCORD_LABEL,
              icon: 'ph--discord-logo--regular',
              data: null,
              position: Position.first,
            }),
          ]);
        },
      }),

      // Home article toolbar actions: Start tour + Hide Welcome. Matched on the Home node (created
      // by plugin-space: type === SpaceSchema.SPACE_HOME_NODE_TYPE, space on properties.space). The actions are
      // conditional on the default space and the welcome not being dismissed — read reactively via
      // the space properties atom so the actions appear/disappear live without a React re-render cycle.
      AppGraphBuilder.createExtension({
        id: 'spaceHomeActions',
        match: (node): Option.Option<Space> => {
          const space = (node.properties as { space?: unknown }).space;
          return node.type === SpaceSchema.SPACE_HOME_NODE_TYPE && isSpace(space) ? Option.some(space) : Option.none();
        },
        actions: (space, get) => {
          const [client] = get(clientCapabilityAtom);
          // Both spaces are resolved from the space list, which fills incrementally — subscribe to
          // it so the actions appear once the settings space lands rather than staying hidden.
          const spaces = client && get(CreateAtom.fromObservable(client.spaces));
          const settingsProperties = spaces && AppSpace.getSettingsSpace(client)?.properties;
          const defaultSpace = spaces && AppSpace.getDefaultSpace(client);
          const properties = settingsProperties ? get(Obj.atom(settingsProperties)) : undefined;
          const isDismissed = properties
            ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
            : false;
          // Without settings-space properties "Hide Welcome" would invoke and silently persist
          // nothing, so the actions stay hidden until the space that stores the flag resolves.
          const showActions = !!properties && !!defaultSpace && space.id === defaultSpace.id && !isDismissed;
          if (!showActions) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppGraphNode.makeAction({
              id: HelpOperation.Start.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({ ...state, showHints: true }));
                yield* Operation.invoke(HelpOperation.Start);
              }),
              properties: {
                label: START_TOUR_LABEL,
                icon: 'ph--path--regular',
                iconOnly: false,
                disposition: 'toolbar',
                testId: 'supportPlugin.startTour',
              },
            }),
            AppGraphNode.makeAction({
              id: HelpOperation.HideWelcome.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(HelpOperation.HideWelcome);
              }),
              properties: {
                label: HIDE_WELCOME_LABEL,
                icon: 'ph--eye-slash--regular',
                iconOnly: false,
                disposition: 'toolbar',
                testId: 'supportPlugin.hideWelcome',
              },
            }),
          ]);
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
