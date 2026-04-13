//
// Copyright 2025 DXOS.org
//

// Plank companion article — a side panel that appears alongside an ExemplarItem.
// Companions are registered via `AppNode.makeCompanion` in the graph builder
// and rendered via a surface with `companionArticle` filter.
// The `data.companionTo` prop contains the parent ECHO object.
//
// This companion queries for other ExemplarItems in the same space,
// demonstrating how to use `useQuery` from within a companion context.

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

import { RelatedItemsList } from '#components';
import type { ExemplarItem } from '#types';
import { ExemplarItem as ExemplarItemSchema } from '#types';

export type ExemplarCompanionPanelProps = {
  companionTo: ExemplarItem.ExemplarItem;
};

export const ExemplarCompanionPanel = ({ companionTo }: ExemplarCompanionPanelProps) => {
  // `Obj.getDatabase` retrieves the database the object belongs to.
  // `useQuery` reactively queries for all ExemplarItems in the same space.
  const db = Obj.getDatabase(companionTo);
  const allItems = useQuery(db, Filter.type(ExemplarItemSchema.ExemplarItem));
  const relatedItems = allItems.filter((item) => item.id !== companionTo.id);
  const { invokePromise } = useOperationInvoker();

  // Navigate to a related item by invoking the layout's Open operation.
  // `getObjectPathFromObject` resolves the ECHO object to a navigable path.
  const handleNavigate = useCallback(
    (id: string) => {
      const item = allItems.find((item) => item.id === id);
      if (item) {
        void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(item)] });
      }
    },
    [allItems, invokePromise],
  );

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content>
        <RelatedItemsList items={relatedItems} onNavigate={handleNavigate} />
      </Panel.Content>
    </Panel.Root>
  );
};

export default ExemplarCompanionPanel;
