//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as DeckRole from '@dxos/plugin-deck/DeckRole';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';
import * as Position from '@dxos/util/Position';

import {
  DiscordPanel,
  FeedbackPanel,
  HelpMenu,
  ShortcutsDialogContent,
  ShortcutsHints,
  ShortcutsList,
  SupportArticle,
  SupportCompanion,
  SupportHomeCompanion,
  SupportSettings,
} from '#containers';
import { meta } from '#meta';
import { Support } from '#types';

import { SHORTCUTS_DIALOG } from '../constants.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'supportTicket',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Support.Ticket),
          AppSurface.object(AppSurface.Section, Support.Ticket),
        ),
        component: SupportArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'feedback',
        filter: Surface.Root.makeFilter(AppSurface.deckCompanion('help')),
        component: FeedbackPanel,
      }),
      Surface.Root.create({
        id: 'discord',
        filter: Surface.Root.makeFilter(AppSurface.deckCompanion('discord')),
        component: DiscordPanel,
      }),
      Surface.Root.create({
        id: 'helpMenu',
        filter: Surface.Root.makeFilter(AppSurface.StatusIndicator),
        position: Position.last,
        component: HelpMenu,
      }),
      // Generic plank companion: shows the description from the plugin that
      // owns the open article's typename. Matches any article via
      // `companion(Article)` with no schema filter; the resolver inside the
      // panel maps `companionTo` → owning plugin → `meta.description`.
      Surface.Root.create({
        id: 'helpCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'help'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: SupportCompanion,
        props: ({ data: { companionTo, attendableId } }) => ({ companionTo, attendableId }),
      }),
      Surface.Root.create({
        id: 'homeHelpCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'help'),
          AppSurface.companion(AppSurface.Article, SpaceSchema.SPACE_HOME_NODE_TYPE),
        ),
        component: SupportHomeCompanion,
      }),
      Surface.Root.create({
        id: 'hints',
        filter: Surface.Root.makeFilter(DeckRole.Hints),
        component: ShortcutsHints,
      }),
      Surface.Root.create({
        id: 'keyshortcuts',
        filter: Surface.Root.makeFilter(DeckRole.Keyshortcuts),
        component: ShortcutsList,
      }),
      Surface.Root.create({
        id: SHORTCUTS_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, SHORTCUTS_DIALOG),
        component: ShortcutsDialogContent,
      }),
      Surface.Root.create({
        id: 'settings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: SupportSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
