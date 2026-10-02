//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Table } from '@dxos/react-ui-table/types';

import { TableArticle, TableCard } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
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
      Surface.Root.create({
        id: 'tableCard',
        filter: AppSurface.object(AppSurface.CardContent, Table.Table),
        component: TableCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
    ]),
  ),
);
