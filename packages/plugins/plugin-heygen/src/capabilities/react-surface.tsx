//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { GenerateForm } from '@dxos/plugin-studio/surfaces';
import { Position } from '@dxos/util';

import { HeyGenGenerateForm } from '#components';

/**
 * Overrides studio's default schema-driven GenerateForm for `kind: 'video'` with the HeyGen picker
 * (avatar/voice selects). `Position.first` beats the studio default, which matches any schema.
 */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'heygenGenerateForm',
        position: Position.first,
        filter: Surface.makeFilter(GenerateForm, (data) => data.kind === 'video'),
        component: ({ data }) => (
          <HeyGenGenerateForm
            schema={data.schema}
            value={data.value}
            onChange={data.onChange}
            readonly={data.readonly}
          />
        ),
      }),
    ]),
  ),
);
