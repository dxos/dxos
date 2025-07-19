//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj, Relation, type Ref } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { TableView } from '@dxos/react-ui-table/types';
import { DataType, Projection } from '@dxos/schema';

import { ObjectDetailsPanel, TableContainer, TableViewEditor } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: DataType.HasView } =>
        Obj.instanceOf(DataType.HasView, data.subject) &&
        // TODO(wittjosiah): Remove cast.
        Obj.instanceOf(TableView, Relation.getTarget(data.subject as any)),
      component: ({ data, role }) => <TableContainer view={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/companion/schema`,
      role: 'article',
      filter: (data): data is { companionTo: DataType.HasView; subject: 'schema' } =>
        Obj.instanceOf(DataType.HasView, data.companionTo) &&
        // TODO(wittjosiah): Remove cast.
        Obj.instanceOf(TableView, Relation.getTarget(data.companionTo as any)) &&
        data.subject === 'schema',
      component: ({ data, role }) => {
        return (
          <StackItem.Content role={role}>
            <TableViewEditor view={data.companionTo} />
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
        companionTo: Obj.Obj<{ view: Ref.Ref<Projection> } | { cardView: Ref.Ref<Projection> }>;
      } => {
        if (data.subject !== 'selected-objects' || !data.companionTo || !Obj.isObject(data.companionTo)) {
          return false;
        }

        const companionTo = data.companionTo as any;
        // TODO(ZaymonFC): Unify the path of view between table and kanban.
        const hasValidView = companionTo.view?.target instanceof Projection;
        const hasValidCardView = companionTo.cardView?.target instanceof Projection;
        return hasValidView || hasValidCardView;
      },
      component: ({ data }) => {
        const view = 'view' in data.companionTo ? data.companionTo.view : data.companionTo.cardView;
        const viewTarget = view?.target;
        if (!viewTarget) {
          return null;
        }

        return <ObjectDetailsPanel objectId={data.companionTo.id} projection={viewTarget} />;
      },
    }),
  ]);
