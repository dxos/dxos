//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ProjectCapabilities } from '#types';

import { defaultTemplates } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(ProjectCapabilities.Template, defaultTemplates);
  }),
);
