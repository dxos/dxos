//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { RepositoryArticle, SandboxArticle } from '#containers';
import { Repository, Sandbox } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'repositoryArticle',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Repository.Repository),
          AppSurface.object(AppSurface.Section, Repository.Repository),
        ),
        component: RepositoryArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'sandboxArticle',
        filter: AppSurface.object(AppSurface.Article, Sandbox.Sandbox),
        component: SandboxArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ]),
  ),
);
