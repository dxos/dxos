//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { NotFound } from '@dxos/app-toolkit';
import { AppSurface, NotFoundArticle } from '@dxos/app-toolkit/ui';
import { Node } from '@dxos/plugin-graph';
import { Position } from '@dxos/util';

import { Home, NavBranch } from '#components';

const ALLOWED_DISPOSITIONS = ['workspace', 'user-account', 'pin-end'];

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'home',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === Node.RootId),
        component: () => <Home />,
      }),
      Surface.create({
        id: 'notFound',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === NotFound.NOT_FOUND_PATH),
        component: () => <NotFoundArticle />,
      }),
      Surface.create({
        id: 'navBranch',
        position: Position.last,
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data) => ALLOWED_DISPOSITIONS.includes(data.properties?.disposition) || data.properties?.role === 'branch',
        ),
        component: ({ data }) => <NavBranch id={data.attendableId} />,
      }),
    ]),
  ),
);
