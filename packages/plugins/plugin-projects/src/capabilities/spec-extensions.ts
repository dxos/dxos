//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { FeatureMap, ProjectCapabilities } from '#types';

import { featureEmbedExtensions } from '../containers/SpecDocumentArticle/feature-embed-extensions.tsx';
import { ProjectsNamespace } from '../namespace.ts';

/**
 * The features dialect: a spec using it draws its feature embeds as cards in any editor of it, such as plugin-code's,
 * and offers `/feature`.
 */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(ProjectCapabilities.SpecDialect, {
      id: FeatureMap.DIALECT,
      label: ['features-dialect.label', { ns: ProjectsNamespace.key }],
    }),
    Capability.contribute(ProjectCapabilities.SpecExtensions, (spec, { attendableId, t }) =>
      FeatureMap.usesDialect(spec)
        ? featureEmbedExtensions(spec, {
            attendableId,
            newName: t('feature-map.new-feature.name', { ns: ProjectsNamespace.key }),
          })
        : [],
    ),
  ]),
);
