//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { type Space, isSpace } from '@dxos/react-client/echo';

import { CallsContainer } from '../components';
import { CALLS_PLUGIN } from '../meta';
import { type Call, isCall } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${CALLS_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: Call } => isCall(data.subject),
      // TODO(mykola): Think about what we use as a roomId. Using the space key is not a good idea.
      component: ({ data, role }) => <CallsContainer space={data.subject.space} roomId={data.subject.space.key} />,
    }),
    createSurface({
      id: `${CALLS_PLUGIN}/assistant`,
      role: 'complementary--calls',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      // TODO(mykola): Think about what we use as a roomId. Using the space key is not a good idea.
      component: ({ data }) => <CallsContainer space={data.subject} roomId={data.subject.key} />,
    }),
  ]);
