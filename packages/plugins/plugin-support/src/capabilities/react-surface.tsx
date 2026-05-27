//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { DXN } from '@dxos/keys';

import { SupportSettings } from '#components';
import {
  DiscordPanel,
  FeedbackPanel,
  HelpMenu,
  ShortcutsDialogContent,
  ShortcutsHints,
  ShortcutsList,
  SupportArticle,
  SupportCompanion,
  WelcomeArticle,
} from '#containers';
import { meta } from '#meta';
import { type Settings, Support } from '#types';

import { SHORTCUTS_DIALOG, WELCOME_NODE_ID } from '../constants';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.supportTicket'),
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Support.Ticket),
          AppSurface.object(AppSurface.Section, Support.Ticket),
        ),
        component: ({ data, role }) => (
          <SupportArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.welcomeArticle'),
        filter: AppSurface.literal(AppSurface.Article, WELCOME_NODE_ID),
        component: ({ role }) => <WelcomeArticle role={role} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.feedback'),
        role: 'deck-companion--help',
        component: () => <FeedbackPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.discord'),
        role: 'deck-companion--discord',
        component: () => <DiscordPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.helpMenu'),
        role: 'status-indicator',
        position: 'last',
        component: () => <HelpMenu />,
      }),
      // Generic plank companion: shows the description from the plugin that
      // owns the open article's typename. Matches any article via
      // `companion(Article)` with no schema filter; the resolver inside the
      // panel maps `companionTo` → owning plugin → `meta.description`.
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.helpCompanion'),
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'help'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data }) => <SupportCompanion companionTo={data.companionTo} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.hints'),
        role: 'hints',
        component: () => <ShortcutsHints />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.keyshortcuts'),
        role: 'keyshortcuts',
        component: () => <ShortcutsList />,
      }),
      Surface.create({
        id: DXN.make(SHORTCUTS_DIALOG),
        filter: AppSurface.component(AppSurface.Dialog, SHORTCUTS_DIALOG),
        component: () => <ShortcutsDialogContent />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.support.surface.settings'),
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <SupportSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
