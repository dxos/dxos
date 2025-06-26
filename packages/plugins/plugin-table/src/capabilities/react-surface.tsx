//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj, type Ref } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { ObjectDetailsPanel, TableContainer, TableViewEditor } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: TableType } => Obj.instanceOf(TableType, data.subject) && !data.variant,
      component: ({ data, role }) => <TableContainer table={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/companion/schema`,
      role: 'article',
      filter: (data): data is { companionTo: TableType; subject: 'schema' } =>
        Obj.instanceOf(TableType, data.companionTo) && data.subject === 'schema',
      component: ({ data, role }) => {
        return (
          <StackItem.Content role={role}>
            <TableViewEditor table={data.companionTo} />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/selected-objects`,
      role: 'article',
      filter: (
        data,
      ): data is {
        companionTo: Obj.Obj<{ view: Ref.Ref<ViewType> } | { cardView: Ref.Ref<ViewType> }>;
      } => {
        if (data.subject !== 'selected-objects' || !data.companionTo || !Obj.isObject(data.companionTo)) {
          return false;
        }

        const companionTo = data.companionTo as any;
        // TODO(ZaymonFC): Unify the path of view between table and kanban.
        const hasValidView = companionTo.view?.target instanceof ViewType;
        const hasValidCardView = companionTo.cardView?.target instanceof ViewType;
        return hasValidView || hasValidCardView;
      },
      component: ({ data }) => {
        const view = 'view' in data.companionTo ? data.companionTo.view : data.companionTo.cardView;
        const viewTarget = view?.target;
        if (!viewTarget) {
          return null;
        }

        return <ObjectDetailsPanel objectId={data.companionTo.id} view={viewTarget} />;
      },
    }),
  ]);
