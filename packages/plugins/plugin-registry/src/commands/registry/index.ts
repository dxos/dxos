//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { publish } from './publish';
import { publishPackage } from './publish-package';
import { publishPublisher } from './publish-publisher';
import { records } from './records';
import { unpublish } from './unpublish';
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
 * - `unpublish` — remove a package (profile + releases) from your PDS.
 * - `verify` — write a publisher.verification record (indexed only from the configured verifier).
 * - `records` — list everything the authenticated repo has published under `org.dxos.experimental.*`.
 */
export const registry: Command.Command<any, any, any, any> = Command.make('registry').pipe(
  Command.withDescription('Publish to and inspect the AT Protocol-backed DXOS plugin registry.'),
  Command.withSubcommands([publish, publishPackage, publishPublisher, unpublish, verify, records]),
);
