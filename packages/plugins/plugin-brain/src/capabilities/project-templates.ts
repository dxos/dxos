//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { ProjectCapabilities } from '@dxos/plugin-projects/types';

import { mailboxFacts } from '../templates/mailbox-facts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.contribute(ProjectCapabilities.Template, mailboxFacts)];
  }),
);
