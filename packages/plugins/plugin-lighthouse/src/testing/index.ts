//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { type Database, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';

import { LighthouseCapabilities, Research } from '#types';

import { LIGHTHOUSE_CONNECTOR_ID } from '../constants.ts';
import { FIXTURE_URL, GOAL, RUN, makeFixtureClient } from './fixtures.ts';

export * from './fixtures.ts';

/** A host plugin answering the fixture URL with the fixture client, so stories need no lighthouse server. */
export const FixtureClientPlugin = Plugin.define({
  profile: { key: 'org.dxos.test.lighthouseFixture', name: 'Lighthouse fixture client' },
}).pipe(
  Plugin.addModule(
    Capability.inlineModule('lighthouse-fixture-client', { provides: [LighthouseCapabilities.ClientFactory] }, () =>
      Effect.succeed(
        Capability.contribute(LighthouseCapabilities.ClientFactory, {
          match: (url) => url.startsWith(FIXTURE_URL),
          make: () => makeFixtureClient(),
        }),
      ),
    ),
  ),
  Plugin.make,
);

/** Adds a fixture connection and a Research that has run, to a space. */
export const seedResearch = (db: Database.Database, { run = true }: { run?: boolean } = {}): Research.Research => {
  const accessToken = db.add(
    Obj.make(AccessToken.AccessToken, { source: 'lighthouse.local', account: FIXTURE_URL, token: '' }),
  );
  const connection = db.add(
    Connection.make({ name: 'Lighthouse', connectorId: LIGHTHOUSE_CONNECTOR_ID, accessToken: Ref.make(accessToken) }),
  );
  return db.add(
    Research.make({
      name: 'Board game cafés',
      goal: GOAL,
      budget: 'quick',
      connection: Ref.make(connection),
      ...(run ? { run: RUN } : {}),
    }),
  );
};
