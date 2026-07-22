//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Migration } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

const identityTransform = async (from: any) => ({ ...from });
const noopCallback = async () => {};

const migrations = [
  Migration.define({
    from: Chat.LegacyCompanionTo,
    to: Chat.CompanionTo,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.provide(ClientCapabilities.Migration, migrations);
  }),
);
