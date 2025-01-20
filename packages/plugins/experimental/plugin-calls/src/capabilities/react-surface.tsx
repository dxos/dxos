//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { CallsContainer } from '../components';
import { meta } from '../meta';
import { type Call, isCall } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: meta.id,
      role: 'article',
      filter: (data): data is { subject: Call } => isCall(data.subject),
      component: ({ data, role }) => <CallsContainer space={data.subject.space} role={role} />,
    }),
  );
