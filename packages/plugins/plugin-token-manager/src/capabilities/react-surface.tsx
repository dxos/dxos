//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isSpace, type Space } from '@dxos/react-client/echo';

import { TokensContainer } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: 'space-settings--token-manager',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      component: ({ data: { subject } }) => <TokensContainer space={subject} />,
    }),
  ]);
