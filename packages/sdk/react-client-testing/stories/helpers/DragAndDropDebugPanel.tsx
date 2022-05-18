//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { truncateKey } from '@dxos/debug';

const DEBUG_PANEL_WIDTH = 400;

type Order = { [key: string]: string }

interface DragAndDropDebugPanelProps {
  previousOrder: Order | undefined,
  order: Order
  width? : number
}

export const DragAndDropDebugPanel = ({
  previousOrder,
  order,
  width = DEBUG_PANEL_WIDTH
}: DragAndDropDebugPanelProps) => {
  const reduceKeyLength = (order: {[key: string]: string}) => {
    return Object.assign({}, ...Object.entries(order).map(([key, value]) => ({
      [truncateKey(key, 5)]: truncateKey(value, 5)
    })));
  };

  return (
    <div style={{ display: 'flex', fontSize: 18 }}>
      <div style={{ width }}>
        <h3>Previous <span style={{ fontWeight: 100 }}>(truncated)</span></h3>
        <pre>{JSON.stringify(previousOrder ? reduceKeyLength(previousOrder) : {}, undefined, 2)}</pre>
      </div>
      <div style={{ marginLeft: 8, width }}>
        <h3>Current <span style={{ fontWeight: 100 }}>(truncated)</span></h3>
        <pre>{JSON.stringify(reduceKeyLength(order), undefined, 2)}</pre>
      </div>
    </div>
  );
};
