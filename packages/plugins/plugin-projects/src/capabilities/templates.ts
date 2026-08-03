//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { ProjectCapabilities } from '#types';

import { defaultTemplates } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return defaultTemplates.map((template) => Capability.contributes(ProjectCapabilities.Template, template));
  }),
);
