//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { useLayout } from '@dxos/app-framework/react';
import { parseId, useSpace } from '@dxos/react-client/echo';

import { TokensContainer } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${meta.id}/space-settings`,
      component: () => {
        const layout = useLayout();
        const { spaceId } = parseId(layout.workspace);
        const space = useSpace(spaceId);

        if (!space || !spaceId) {
          return null;
        }

        return <TokensContainer space={space} />;
      },
    }),
  ]);
