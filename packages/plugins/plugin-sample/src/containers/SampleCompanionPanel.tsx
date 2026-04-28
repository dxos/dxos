//
// Copyright 2025 DXOS.org
//

// Plank companion article — a side panel that appears alongside a SampleItem.
// Companions are registered via `AppNode.makeCompanion` in the graph builder
// and rendered via a surface with `companionArticle` filter.
// The `data.companionTo` prop contains the parent ECHO object.
//
// This companion queries for other SampleItems in the same space,
// demonstrating how to use `useQuery` from within a companion context.

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

import { RelatedItemsList } from '#components';
import type { SampleItem } from '#types';
import { SampleItem as SampleItemSchema } from '#types';

export type SampleCompanionPanelProps = {
  companionTo: SampleItem.SampleItem;
};

export const SampleCompanionPanel = ({ companionTo }: SampleCompanionPanelProps) => {
  // `Obj.getDatabase` retrieves the database the object belongs to.
  // `useQuery` reactively queries for all SampleItems in the same space.
  const db = Obj.getDatabase(companionTo);
  const allItems = useQuery(db, Filter.type(SampleItemSchema.SampleItem));
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

export default SampleCompanionPanel;
