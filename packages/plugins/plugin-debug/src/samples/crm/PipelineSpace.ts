//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { Accounts, Contacts } from './accounts.ts';
import { Inbox } from './inbox.ts';
import { PipelineBoard } from './pipeline.ts';
import { REFERENCE } from './util.ts';

const partials = {
  accounts: Accounts,
  contacts: Contacts,
  pipeline: PipelineBoard,
  inbox: Inbox,
};

/**
 * A CRM template: seven accounts spread across the pipeline stages, one named contact each, a
 * board whose columns are views filtered on `Organization.status`, and the mail thread behind each
 * stage.
 *
 * Nothing is filed into a collection: Organization, Person, Pipeline and Mailbox are not
 * collection-item types, so they live directly in the space DB and surface through their own
 * containers and the database viewer.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Northwind Sales', icon: 'handshake', hue: 'purple' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const accounts = yield* partials.accounts();
        yield* partials.contacts(accounts);
        yield* partials.pipeline(accounts);
        yield* partials.inbox();
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.pipeline',
    description: 'Seven accounts across the pipeline stages, a contact each, and the mail behind them.',
    definition: make(),
  });
