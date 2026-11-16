//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import * as GitHubCapabilities from '@dxos/plugin-github/GitHubCapabilities';

import { CodeOperation } from '#types';

const REVIEWS = ['**/*.review.mdl'];

/**
 * Deus specs in a synced GitHub repository become Spec objects (plugin-github spec/FILE-SYNC.mdl F-6.1), and their
 * reviews become SpecReviews. Reviews are pull-only: the repository is where they are written.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(GitHubCapabilities.FileMapping, {
        id: 'org.dxos.plugin.code.spec',
        match: ['**/*.mdl'],
        exclude: REVIEWS,
        type: Spec.Spec,
        import: CodeOperation.ImportSpecFile,
        export: CodeOperation.ExportSpecFile,
      }),
      Capability.contribute(GitHubCapabilities.FileMapping, {
        id: 'org.dxos.plugin.code.specReview',
        match: REVIEWS,
        type: SpecReview.SpecReview,
        import: CodeOperation.ImportSpecReviewFile,
      }),
    ];
  }),
);
