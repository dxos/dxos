//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Table } from '@dxos/react-ui-table/types';

import { TableArticle, TableCard } from '#containers';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'table',
          // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
          filter: AppSurface.oneOf(
            AppSurface.object(AppSurface.Article, Table.Table),
            AppSurface.object(AppSurface.Section, Table.Table),
            AppSurface.object(AppSurface.Slide, Table.Table),
          ),
          component: TableArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
        Surface.create({
          id: 'tableCard',
          filter: AppSurface.object(AppSurface.CardContent, Table.Table),
          component: TableCard,
          props: ({ role, data: { subject } }) => ({ role, subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.slide'],
  },
);
