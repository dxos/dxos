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

  const gridStyles = detailsPosition === 'right' ? 'grid grid-columns-[3fr_5fr]' : 'grid grid-rows-[3fr_5fr]';

  return (
    <div className={mx('bs-full', gridStyles, styles.border)}>
      <div>
        <DynamicTable data={data} properties={properties} onSelectionChanged={handleSelectionChanged} />
      </div>

      <div className='bs-full overflow-auto text-sm border-t border-separator'>
        {selected ? (
          <JsonView data={detailsTransform !== undefined ? detailsTransform(selected) : selected} />
        ) : (
          'Make a selection for details'
        )}
      </div>
    </div>
  );
};
