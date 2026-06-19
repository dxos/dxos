//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, TypeSection } from '@dxos/app-toolkit';

import { Markdown } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(
      AppCapabilities.NavigationPathResolver,
      TypeSection.createTypeSectionPathResolver(Markdown.Document),
    );
  }),
);
