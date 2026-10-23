//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';
import { Text } from '@dxos/schema';
import { Spec } from '@dxos/types';

import { type Config } from './config.ts';

export type SpecResult = { spec: Spec.Spec };

/**
 * The plugin's spec in Deus, as the reader would import a repo spec into the space. It carries the repo-style path its
 * features cite as its foreign key, so a feature card opens this object rather than a GitHub URL that does not exist
 * for a template.
 */
export const makeSpec = (config: Config): SampleSpace.Partial<SpecResult> =>
  SampleSpace.partial('spec', {
    schemas: [Spec.Spec, Text.Text],
    run: () =>
      Effect.gen(function* () {
        const spec = yield* Database.add(
          Obj.make(Spec.Spec, {
            name: config.name,
            content: Ref.make(Text.make({ content: config.spec.content })),
            [Obj.Meta]: { keys: [{ source: Feature.SPEC_KEY_SOURCE, id: config.spec.path }] },
          }),
        );
        return { spec };
      }),
  });
