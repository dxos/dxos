//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SceneArticle, SceneCard } from '#containers';
import { Scene } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'scene',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Scene.Scene),
          AppSurface.object(AppSurface.Section, Scene.Scene),
        ),
        component: SceneArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'sceneCard',
        filter: AppSurface.object(AppSurface.CardContent, Scene.Scene),
        component: SceneCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
    ]),
  ),
);
