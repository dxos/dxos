//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, Paths, TypeSection } from '@dxos/app-toolkit';

import { Book } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(
        AppCapabilities.NavigationPathResolver,
        TypeSection.createTypeSectionPathResolver(Book.Book, { groupId: Paths.GroupSegments.content }),
      ),
    ];
  }),
);
