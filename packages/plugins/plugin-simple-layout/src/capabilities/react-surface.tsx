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

import { Home, NavBranch } from '#components';

type SurfaceData = {
  attendableId: string;
  properties: Record<string, any>;
};

const ALLOWED_DISPOSITIONS = ['workspace', 'user-account', 'pin-end'];

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'home',
        filter: {
          bindings: [
            {
              role: AppSurface.Article.role,
              guard: (data: unknown): boolean => {
                if (typeof data !== 'object' || data === null) {
                  return false;
                }
                return (data as { attendableId?: unknown }).attendableId === Node.RootId;
              },
            },
          ],
        } satisfies Surface.Filter<SurfaceData>,
        component: () => <Home />,
      }),
      Surface.create({
        id: 'notFound',
        filter: {
          bindings: [
            {
              role: AppSurface.Article.role,
              guard: (data: unknown): boolean => {
                if (typeof data !== 'object' || data === null) {
                  return false;
                }
                return (data as { attendableId?: unknown }).attendableId === NotFound.NOT_FOUND_PATH;
              },
            },
          ],
        } satisfies Surface.Filter<SurfaceData>,
        component: () => <NotFoundArticle />,
      }),
      Surface.create({
        id: 'navBranch',
        position: 'last',
        filter: {
          bindings: [
            {
              role: AppSurface.Article.role,
              guard: (data: unknown): boolean => {
                if (typeof data !== 'object' || data === null) {
                  return false;
                }
                const props = (data as { properties?: Record<string, any> }).properties;
                return ALLOWED_DISPOSITIONS.includes(props?.disposition) || props?.role === 'branch';
              },
            },
          ],
        } satisfies Surface.Filter<SurfaceData>,
        component: ({ data }) => <NavBranch id={data.attendableId} />,
      }),
    ]),
  ),
);
