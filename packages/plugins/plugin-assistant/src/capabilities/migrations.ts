//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Chat, ResearchGraph } from '@dxos/assistant-toolkit';
import { defineObjectMigration } from '@dxos/client/echo';
import { ClientCapabilities } from '@dxos/plugin-client/types';

const identityTransform = async (from: any) => ({ ...from });
const noopCallback = async () => {};

const migrations = [
  defineObjectMigration({
    from: Chat.LegacyCompanionTo,
    to: Chat.CompanionTo,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
  defineObjectMigration({
    from: ResearchGraph.LegacyResearchGraph,
    to: ResearchGraph.ResearchGraph,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
