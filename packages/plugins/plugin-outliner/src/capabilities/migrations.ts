//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { defineObjectMigration } from '@dxos/client/echo';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { Journal } from '#types';

const identityTransform = async (from: any) => ({ ...from });
const noopCallback = async () => {};

const migrations = [
  defineObjectMigration({
    from: Journal.LegacyJournalEntry,
    to: Journal.JournalEntry,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
