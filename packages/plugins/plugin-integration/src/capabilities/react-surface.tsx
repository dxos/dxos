//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useLayout } from '@dxos/app-framework';
import { parseId, useSpace } from '@dxos/react-client/echo';

import { ADD_TOKEN_DIALOG, AddTokenDialog, IntegrationsContainer, type AddTokenDialogProps } from '../components';
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

        return <IntegrationsContainer space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/add-token-dialog`,
      role: 'dialog',
      filter: (data): data is { props: AddTokenDialogProps } => data.component === ADD_TOKEN_DIALOG,
      component: ({ data }) => <AddTokenDialog {...data.props} />,
    }),
  ]);
