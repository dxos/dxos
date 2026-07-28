//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Chat, agentMigration } from '@dxos/assistant-toolkit';
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
  // Agent 0.1.0 -> 0.2.0: identity/preset shape (plugin-projects PLAN.md phase D).
  agentMigration,
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
