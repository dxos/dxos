//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { PublicKey } from '@dxos/react-client';
import { type Space, isSpace } from '@dxos/react-client/echo';

import { CallsContainer } from '../components';
import { CALLS_PLUGIN } from '../meta';
import { type Call, isCall } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${CALLS_PLUGIN}/thread-calls`,
      role: 'thread-calls',
      filter: (data): data is { subject: Call } => isCall(data.subject),
      component: ({ data }) => (
        <CallsContainer space={data.subject.space} roomId={PublicKey.from(data.subject.space.id)} />
      ),
    }),
    createSurface({
      id: `${CALLS_PLUGIN}/assistant`,
      role: 'complementary--calls',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      component: ({ data }) => <CallsContainer space={data.subject} roomId={PublicKey.from(data.subject.id)} />,
    }),
  ]);