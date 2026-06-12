//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AutomationCapabilities } from '@dxos/plugin-automation';

import { crm } from '../templates/crm';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.contributes(AutomationCapabilities.Template, crm)];
  }),
);
