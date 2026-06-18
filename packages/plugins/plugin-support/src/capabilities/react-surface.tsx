//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppSpace, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation } from '@dxos/echo';
import { SpaceHomeContent } from '@dxos/plugin-space';
import { useClient } from '@dxos/react-client';
import { useObject } from '@dxos/react-client/echo';

import { SupportSettings } from '#components';
import {
  DiscordPanel,
  FeedbackPanel,
  HelpMenu,
  ShortcutsDialogContent,
  ShortcutsHints,
  ShortcutsList,
  SpaceHomeWelcome,
  SupportArticle,
  SupportCompanion,
} from '#containers';
import { meta } from '#meta';
import { Support, type Settings } from '#types';

import { WelcomeDismissedAnnotation } from '../annotations';
import { SHORTCUTS_DIALOG } from '../constants';
import { Hints, Keyshortcuts } from '../roles';

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
        id: 'spaceHomeWelcome',
        filter: Surface.makeFilter(SpaceHomeContent),
        position: 'first',
        component: ({ data }) => <SpaceHomeWelcome space={data.space} />,
      }),
      Surface.create({
        id: 'feedback',
        filter: Surface.makeFilter(AppSurface.deckCompanion('help')),
        component: () => <FeedbackPanel />,
      }),
      Surface.create({
        id: 'discord',
        filter: Surface.makeFilter(AppSurface.deckCompanion('discord')),
        component: () => <DiscordPanel />,
      }),
      Surface.create({
        id: 'helpMenu',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
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
        filter: Surface.makeFilter(Hints),
        component: () => <ShortcutsHints />,
      }),
      Surface.create({
        id: 'keyshortcuts',
        filter: Surface.makeFilter(Keyshortcuts),
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
        component: ({ data: { subject } }) => {
          const client = useClient();
          const { invokePromise } = useOperationInvoker();
          const personal = AppSpace.getPersonalSpace(client);
          const [properties, updateProperties] = useObject(personal?.properties);
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          const welcomeDismissed = properties
            ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
            : false;
          const handleShowWelcome = () => {
            if (!personal) {
              return;
            }
            updateProperties((props) => Annotation.set(props, WelcomeDismissedAnnotation, false));
            const workspace = Paths.getSpacePath(personal.id);
            void invokePromise(LayoutOperation.Open, { subject: [Paths.getSpaceHomePath(personal.id)], workspace });
          };
          return (
            <SupportSettings
              settings={settings}
              onSettingsChange={updateSettings}
              onShowWelcome={welcomeDismissed ? handleShowWelcome : undefined}
            />
          );
        },
      }),
    ]),
  ),
);
