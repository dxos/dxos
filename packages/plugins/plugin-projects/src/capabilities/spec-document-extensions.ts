//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ProjectCapabilities } from '#types';

import { featureEmbedExtensions } from '../containers/SpecDocumentArticle/feature-embed-extensions.tsx';
import { ProjectsNamespace } from '../namespace.ts';

/** A spec's document draws its feature embeds as cards in any editor of it, such as plugin-code's. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(ProjectCapabilities.SpecDocumentExtensions, (document, { attendableId, t }) =>
      featureEmbedExtensions(document, {
        attendableId,
        newName: t('feature-map.new-feature.name', { ns: ProjectsNamespace.key }),
      }),
    ),
  ),
);
