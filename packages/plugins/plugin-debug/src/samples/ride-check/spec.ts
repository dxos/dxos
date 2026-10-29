//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';
import { Text } from '@dxos/schema';
import { SpecDocument } from '@dxos/types';

import content from './SPEC.mdl?raw';

/**
 * The spec's repo-style path. Features cite `<path>#F-n`, and the spec carries the path as its foreign key, so a
 * feature card opens this object rather than a GitHub URL that does not exist for a template.
 */
export const SPEC_PATH = 'ride-check/SPEC.mdl';

export type SpecResult = { spec: SpecDocument.SpecDocument };

/** The Ride Check spec in Deus, as the reader would import a repo spec into the space. */
export const SpecPartial: SampleSpace.Partial<SpecResult> = SampleSpace.partial('spec', {
  schemas: [SpecDocument.SpecDocument, Text.Text],
  run: () =>
    Effect.gen(function* () {
      const spec = yield* Database.add(
        Obj.make(SpecDocument.SpecDocument, {
          name: 'Ride Check',
          content: Ref.make(Text.make({ content })),
          [Obj.Meta]: { keys: [{ source: Feature.SPEC_KEY_SOURCE, id: SPEC_PATH }] },
        }),
      );
      return { spec };
    }),
});
