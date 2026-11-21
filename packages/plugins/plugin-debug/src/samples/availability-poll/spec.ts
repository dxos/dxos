//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj } from '@dxos/echo';
import * as Feature from '@dxos/plugin-code/Feature';
import { Text } from '@dxos/schema';

import flightsContent from './FLIGHTS.mdl?raw';
import content from './SPEC.mdl?raw';

/** The specs' repo-style paths, each carried as its spec's foreign key: the file the spec syncs with. */
export const SPEC_PATH = 'availability-poll/SPEC.mdl';
export const FLIGHTS_PATH = 'availability-poll/FLIGHTS.mdl';

export type SpecResult = { spec: Spec.Spec; flights: Spec.Spec };

const addSpec = (name: string, text: string, path: string) =>
  Effect.gen(function* () {
    const spec = Spec.make({ name, content: text });
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push({ source: Feature.SPEC_KEY_SOURCE, id: path });
    });
    return yield* Database.add(spec);
  });

/** The poll spec and the flight options spec it hands its last feature to, as the reader would import them. */
export const SpecPartial: SampleSpace.Partial<SpecResult> = SampleSpace.partial('spec', {
  schemas: [Spec.Spec, Text.Text],
  run: () =>
    Effect.gen(function* () {
      const spec = yield* addSpec('Availability Poll', content, SPEC_PATH);
      const flights = yield* addSpec('Flight options', flightsContent, FLIGHTS_PATH);
      return { spec, flights };
    }),
});
