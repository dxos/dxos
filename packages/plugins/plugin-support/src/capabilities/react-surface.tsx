//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getPersonalSpace, getSpaceHomePath, getSpacePath } from '@dxos/app-toolkit';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Annotation } from '@dxos/echo';
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
  SpaceHomeArticle,
  SupportArticle,
  SupportCompanion,
} from '#containers';
import { meta } from '#meta';
import { Support } from '#types';

import { WelcomeDismissedAnnotation } from '../annotations';
import { SHORTCUTS_DIALOG, SPACE_HOME_NODE_TYPE } from '../constants';

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
        filter: AppSurface.literal(AppSurface.Article, SPACE_HOME_NODE_TYPE),
        component: ({ data, role }) => {
          const space = useActiveSpace();
          return <SpaceHomeArticle role={role} attendableId={data.attendableId} space={space} />;
        },
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
        component: () => {
          const client = useClient();
          const { invokePromise } = useOperationInvoker();
          const personal = getPersonalSpace(client);
          const [, updateProperties] = useObject(personal?.properties);
          const handleShowWelcome = () => {
            if (!personal) {
              return;
            }
            updateProperties((props) => Annotation.set(props, WelcomeDismissedAnnotation, false));
            const workspace = getSpacePath(personal.id);
            void invokePromise(LayoutOperation.Open, { subject: [getSpaceHomePath(personal.id)], workspace });
          };
          return <SupportSettings onShowWelcome={handleShowWelcome} />;
        },
      }),
    ]),
  ),
);
