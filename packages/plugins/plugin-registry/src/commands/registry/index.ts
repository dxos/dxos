//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { publish } from './publish';
import { publishPackage } from './publish-package';
import { publishPublisher } from './publish-publisher';
import { records } from './records';
import { verify } from './verify';

/**
 * `dx registry *` — commands for publishing and inspecting records that the
 * DXOS plugin registry indexes from AT Protocol. Auth uses an App Password
 * (per-user secret minted at https://bsky.app/settings/app-passwords); OAuth
 * support is a follow-up.
 *
 * - `publish` — config-driven: build from dx.yml, host the bundle, write records.
 * - `publish-package` — low-level: write profile + release records from flags.
 * - `publish-publisher` — write the publisher's own profile record.
 * - `verify` — curator-only; vouch for a publisher DID.
 * - `records` — list everything the authenticated repo has published under `org.dxos.experimental.*`.
 */
export const registry: Command.Command<any, any, any, any> = Command.make('registry').pipe(
  Command.withDescription('Publish to and inspect the AT Protocol-backed DXOS plugin registry.'),
  Command.withSubcommands([publish, publishPackage, publishPublisher, verify, records]),
);
