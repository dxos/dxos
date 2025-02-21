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
      component: ({ data, role }) => <CallsContainer roomId={data.subject.space.key} />,
    }),
    createSurface({
      id: `${CALLS_PLUGIN}/assistant`,
      role: 'complementary--calls',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      component: ({ data }) => <CallsContainer roomId={data.subject.key} />,
    }),
  ]);
