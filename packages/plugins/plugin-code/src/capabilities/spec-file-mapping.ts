//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GitHubCapabilities from '@dxos/plugin-github/GitHubCapabilities';
import { SpecDocument } from '@dxos/types';

import { CodeOperation } from '#types';

/** Deus specs in a synced GitHub repository become Spec objects (plugin-github spec/FILE-SYNC.mdl F-6.1). */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(GitHubCapabilities.FileMapping, {
      id: 'org.dxos.plugin.code.spec',
      match: ['**/*.mdl'],
      type: SpecDocument.SpecDocument,
      import: CodeOperation.ImportSpecFile,
      export: CodeOperation.ExportSpecFile,
    });
  }),
);
