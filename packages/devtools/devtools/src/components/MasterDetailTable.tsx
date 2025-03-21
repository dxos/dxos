//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { JsonView } from './JsonView';
import { styles } from '../styles';

export type MasterDetailTableProps = {
  properties: TablePropertyDefinition[];
  data: Array<{ id: string; [key: string]: any }>;
  statusBar?: ReactNode;
  detailsTransform?: (data: any) => any;
  detailsPosition?: 'bottom' | 'right';
};

export const MasterDetailTable = ({
  properties,
  data,
  statusBar,
  detailsTransform,
  detailsPosition = 'bottom',
}: MasterDetailTableProps) => {
  const [selectedId, setSelectedId] = useState<string>();
  const selected = useMemo(() => {
    return selectedId ? data.find((item) => item.id === selectedId) : undefined;
  }, [selectedId, data]);

  const handleSelectionChanged = useCallback((selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      setSelectedId(undefined);
      return;
    }
    setSelectedId(selectedIds[selectedIds.length - 1]);
  }, []);

  // Adjust grid layout based on selection state and direction
  const gridLayout = useMemo(() => {
    if (detailsPosition === 'right') {
      return selected ? 'grid grid-columns-[3fr_5fr]' : 'grid grid-columns-[1fr_min-content]';
    } else {
      return selected ? 'grid grid-rows-[3fr_5fr]' : 'grid grid-rows-[1fr_min-content]';
    }
  }, [selected, detailsPosition]);

  return (
    <div className={mx('bs-full', gridLayout)}>
      <div>
        <DynamicTable data={data} properties={properties} onSelectionChanged={handleSelectionChanged} />
      </div>
      <div className='bs-full overflow-auto text-sm border-bs border-separator'>
        {selected ? (
          <JsonView data={detailsTransform !== undefined ? detailsTransform(selected) : selected} />
        ) : (
          <p className={mx('font-mono text-xs p-1')}>Make a selection for details.</p>
        )}
      </div>
    </div>
  );
};
