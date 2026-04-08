//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { SpecArticle } from '#containers';
import { Spec } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'spec',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Spec.Spec; attendableId?: string } =>
          Spec.isSpec(data.subject) && (data.attendableId === undefined || typeof data.attendableId === 'string'),
        component: ({ data: { subject, attendableId }, role }) => (
          <SpecArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
    ),
  ),
);
