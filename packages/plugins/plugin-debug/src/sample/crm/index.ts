//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Accounts, Contacts } from './accounts';
import { Inbox } from './inbox';
import { PipelineBoard } from './pipeline';
import { REFERENCE } from './util';

const phases = {
  accounts: Accounts,
  contacts: Contacts,
  pipeline: PipelineBoard,
  inbox: Inbox,
};

/**
 * A CRM sample space: seven accounts spread across the pipeline stages, one named contact each, a
 * board whose columns are views filtered on `Organization.status`, and the mail thread behind each
 * stage.
 *
 * Nothing is filed into a collection: Organization, Person, Pipeline and Mailbox are not
 * collection-item types, so they live directly in the space DB and surface through their own
 * containers and the database viewer.
 */
export const PipelineSpace = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    space: { name: 'Northwind Sales', icon: 'ph--path--regular', hue: 'purple' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const accounts = yield* phases.accounts();
        yield* phases.contacts(accounts);
        yield* phases.pipeline(accounts);
        yield* phases.inbox();
      }),
  });
