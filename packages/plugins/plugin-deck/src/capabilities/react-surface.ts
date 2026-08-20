//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as Node from '@dxos/app-graph/Node';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import { AppSurface, NotFoundArticle } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { Home, NavBranch } from '#components';
import { DeckSettings } from '#containers';
import { meta } from '#meta';
import type { DeckCapabilities } from '#types';

const ALLOWED_DISPOSITIONS = ['workspace', 'user-account', 'pin-end'];

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ platform = 'desktop' }: DeckCapabilities.DeckPluginOptions = {}) {
    return Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: DeckSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'notFound',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === NotFound.NOT_FOUND_PATH),
        component: NotFoundArticle,
      }),
      // Mobile projects the graph root and branch/workspace nodes onto their own full-screen
      // surfaces instead of the desktop deck's plank rendering.
      ...(platform === 'mobile'
        ? [
            Surface.create({
              id: 'home',
              filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === Node.RootId),
              component: Home,
            }),
            Surface.create({
              id: 'navBranch',
              position: Position.last,
              filter: Surface.makeFilter(
                AppSurface.Article,
                (data) =>
                  ALLOWED_DISPOSITIONS.includes(data.properties?.disposition) || data.properties?.role === 'branch',
              ),
              component: NavBranch,
              props: ({ data: { attendableId } }) => ({ id: attendableId }),
            }),
          ]
        : []),
    ]);
  }),
);
