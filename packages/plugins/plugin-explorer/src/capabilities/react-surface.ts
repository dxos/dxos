//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ExplorerArticle, NeighborhoodCompanion } from '#containers';
import { Graph } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Graph.Graph),
          AppSurface.object(AppSurface.Section, Graph.Graph),
        ),
        component: ExplorerArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // Neighborhood companion offered on any ECHO object; `companionTo` is the active node.
      Surface.create({
        id: 'neighborhood',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'neighborhood'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: NeighborhoodCompanion,
        props: ({ role, data: { companionTo } }) => ({ role, subject: companionTo }),
      }),
    ]),
  ),
);
