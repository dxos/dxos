//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

const DEBUG_PANEL_WIDTH = '100%';

type Order = { [key: string]: string }

interface DragAndDropDebugPanelProps {
  previousOrder: Order | undefined,
  order: Order
  party?: Party
  width? : number | string
}

export const DragAndDropDebugPanel = ({
  previousOrder,
  order,
  party,
  width = DEBUG_PANEL_WIDTH
}: DragAndDropDebugPanelProps) => {
  const getStringToDisplay = (key: string) => {
    if (!party) {
      return truncateKey(key, 5);
    }
    const [item] = party?.select({ id: key }).exec().entities ?? [];
    return truncateKey(key, 5) + ' - ' + item?.model.get('title').substring(0, 5);
  };

  const reduceKeyLength = (order: {[key: string]: string}) => {
    return Object.assign({}, ...Object.entries(order).map(([leftId, rightId]) => ({
      [getStringToDisplay(leftId)]: getStringToDisplay(rightId)
    })));
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width }}>
        <h3>Previous <span style={{ fontWeight: 100 }}>(truncated)</span></h3>
        <pre>{JSON.stringify(previousOrder ? reduceKeyLength(previousOrder) : {}, undefined, 2)}</pre>
      </div>
      <div style={{ marginLeft: 16, width }}>
        <h3>Current <span style={{ fontWeight: 100 }}>(truncated)</span></h3>
        <pre>{JSON.stringify(reduceKeyLength(order), undefined, 2)}</pre>
      </div>
    </div>
  );
};
