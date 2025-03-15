//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isSpace, getSpace } from '@dxos/react-client/echo';

import { CallContainer } from '../components';
import { CALLS_PLUGIN } from '../meta';
import { type Call, isCall } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${CALLS_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: Call } => isCall(data.subject),
      component: ({ data, role }) => <CallContainer space={data.subject.space} roomId={data.subject.space.key} />,
    }),
    createSurface({
      id: `${CALLS_PLUGIN}/assistant`,
      role: 'complementary--calls',
      component: ({ data, role }) => {
        const space = isSpace(data.subject) ? data.subject : getSpace(data.subject)!;
        if (!space) {
          return null;
        }

        return <CallContainer space={space} roomId={space.key} />;
      },
    }),
  ]);
