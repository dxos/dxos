//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DiagramArticle, DiagramCard } from '#containers';
import { Diagram } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'archifyDiagram',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Diagram.Diagram),
          AppSurface.object(AppSurface.Section, Diagram.Diagram),
          AppSurface.object(AppSurface.Slide, Diagram.Diagram),
        ),
        component: DiagramArticle,
        props: ({ role, data: { subject, attendableId, extrinsic } }) => ({ role, subject, attendableId, extrinsic }),
      }),
      Surface.create({
        id: 'archifyDiagramCard',
        filter: AppSurface.object(AppSurface.CardContent, Diagram.Diagram),
        component: DiagramCard,
        props: ({ role, data: { subject, editable } }) => ({ role, subject, editable }),
      }),
    ]),
  ),
);
