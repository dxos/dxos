//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { subscriptions } from './subscriptions.ts';

export const mailbox = Command.make('mailbox').pipe(
  Command.withDescription('Analyze the space mailbox against live data (subscriptions, …).'),
  Command.withSubcommands([subscriptions]),
);
