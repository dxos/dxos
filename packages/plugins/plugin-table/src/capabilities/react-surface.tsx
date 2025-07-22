//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { TableView } from '@dxos/react-ui-table/types';
import { DataType } from '@dxos/schema';

import { ObjectDetailsPanel, TableContainer, TableViewEditor } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(TableView, data.subject.presentation.target),
      component: ({ data, role }) => <TableContainer view={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/companion/schema`,
      role: 'article',
      filter: (data): data is { companionTo: DataType.View; subject: 'schema' } =>
        Obj.instanceOf(DataType.View, data.companionTo) &&
        Obj.instanceOf(TableView, data.companionTo.presentation.target) &&
        data.subject === 'schema',
      component: ({ data, role }) => {
        return (
          <StackItem.Content role={role}>
            <TableViewEditor view={data.companionTo} />
          </StackItem.Content>
        );
      },
    }),
    // TODO(wittjosiah): Factor out to space
    createSurface({
      id: `${meta.id}/selected-objects`,
      role: 'article',
      filter: (data): data is { companionTo: DataType.View; subject: 'selected-objects' } =>
        Obj.instanceOf(DataType.View, data.companionTo) && data.subject === 'selected-objects',
      component: ({ data }) => (
        <ObjectDetailsPanel
          key={fullyQualifiedId(data.companionTo)}
          objectId={fullyQualifiedId(data.companionTo)}
          view={data.companionTo}
        />
      ),
    }),
  ]);
