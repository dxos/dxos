//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';
import { Text } from '@dxos/schema';

import content from './SPEC.mdl?raw';

/**
 * The spec's repo-style path. Features cite `<path>#F-n`, and the spec carries the path as its foreign key, so a
 * feature card opens this object rather than a GitHub URL that does not exist for a template.
 */
export const SPEC_PATH = 'ride-check/SPEC.mdl';

export type SpecResult = { spec: Spec.Spec };

/** The Ride Check spec in Deus, as the reader would import a repo spec into the space. */
export const SpecPartial: SampleSpace.Partial<SpecResult> = SampleSpace.partial('spec', {
  schemas: [Spec.Spec, Text.Text],
  run: () =>
    Effect.gen(function* () {
      const spec = Spec.make({ name: 'Ride Check', content });
      Obj.update(spec, (spec) => {
        Obj.getMeta(spec).keys.push({ source: Feature.SPEC_KEY_SOURCE, id: SPEC_PATH });
      });
      yield* Database.add(spec);
      return { spec };
    }),
});
