//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { mailboxFacts } from '../templates/mailbox-facts.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.contribute(ProjectCapabilities.Template, mailboxFacts)];
  }),
);
