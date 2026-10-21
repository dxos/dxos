//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Repo } from '@dxos/types';

import { RepositoryArticle } from '#containers';

const isEdge = ({ subject }: { subject?: unknown }): boolean =>
  Repo.instanceOf(subject) && Repo.edgeId(subject) !== undefined;

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'repositoryArticle',
        filter: AppSurface.oneOf(
          // Only EDGE serves the reads the viewer is built on; a GitHub repository has nothing to show here.
          AppSurface.object(AppSurface.Article, Repo.Repo, isEdge),
          AppSurface.object(AppSurface.Section, Repo.Repo, isEdge),
        ),
        component: RepositoryArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ]),
  ),
);
