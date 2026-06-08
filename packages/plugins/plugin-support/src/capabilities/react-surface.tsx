//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SupportSettings } from '#components';
import {
  DiscordPanel,
  FeedbackPanel,
  HelpMenu,
  ShortcutsDialogContent,
  ShortcutsHints,
  ShortcutsList,
  SpaceHomeArticle,
  SupportArticle,
  SupportCompanion,
} from '#containers';
import { meta } from '#meta';
import { Support } from '#types';

import { SHORTCUTS_DIALOG, SPACE_HOME_SUBJECT_PREFIX } from '../constants';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'supportTicket',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Support.Ticket),
          AppSurface.object(AppSurface.Section, Support.Ticket),
        ),
        component: ({ data, role }) => (
          <SupportArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'spaceHome',
        filter: AppSurface.subject(
          AppSurface.Article,
          (subject): subject is string => typeof subject === 'string' && subject.startsWith(SPACE_HOME_SUBJECT_PREFIX),
        ),
        component: ({ data, role }) => <SpaceHomeArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'feedback',
        role: 'deck-companion--help',
        component: () => <FeedbackPanel />,
      }),
      Surface.create({
        id: 'discord',
        role: 'deck-companion--discord',
        component: () => <DiscordPanel />,
      }),
      Surface.create({
        id: 'helpMenu',
        role: 'status-indicator',
        position: 'last',
        component: () => <HelpMenu />,
      }),
      // Generic plank companion: shows the description from the plugin that
      // owns the open article's typename. Matches any article via
      // `companion(Article)` with no schema filter; the resolver inside the
      // panel maps `companionTo` → owning plugin → `meta.description`.
      Surface.create({
        id: 'helpCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'help'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data }) => <SupportCompanion companionTo={data.companionTo} />,
      }),
      Surface.create({
        id: 'hints',
        role: 'hints',
        component: () => <ShortcutsHints />,
      }),
      Surface.create({
        id: 'keyshortcuts',
        role: 'keyshortcuts',
        component: () => <ShortcutsList />,
      }),
      Surface.create({
        id: SHORTCUTS_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, SHORTCUTS_DIALOG),
        component: () => <ShortcutsDialogContent />,
      }),
      Surface.create({
        id: 'settings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: () => <SupportSettings />,
      }),
    ]),
  ),
);
