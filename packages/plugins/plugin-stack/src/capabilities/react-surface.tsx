//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { Collection } from '@dxos/echo';

import { StackContainer } from '../containers';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: `${meta.id}.article`,
        role: 'article',
        filter: (data): data is { attendableId: string; subject: Collection.Collection } =>
          typeof data.attendableId === 'string' && Obj.instanceOf(Collection.Collection, data.subject),
        component: ({ role, data }) => {
          return <StackContainer attendableId={data.attendableId} role={role} subject={data.subject} />;
        },
      }),
    ),
  ),
);
