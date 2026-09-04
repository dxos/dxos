//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as NavigationResolver from '@dxos/app-toolkit/NavigationResolver';

import { CodeProject } from '#types';

import { getCodeProjectPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      AppCapabilities.NavigationTargetResolver,
      NavigationResolver.forType(CodeProject.CodeProject, {
        getPath: ({ spaceId, objectId }) => getCodeProjectPath(spaceId, objectId),
      }),
    );
  }),
);
