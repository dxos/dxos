//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';
import { type MaybePromise } from '@dxos/util';

import { JsonView } from './JsonView';
import { Placeholder } from './Placeholder';

export type MasterDetailTableProps = {
  properties: TablePropertyDefinition[];
  data: Array<{ id: string; [key: string]: any }>;
  detailsTransform?: (data: any) => MaybePromise<any>;
  detailsPosition?: 'bottom' | 'right';
  onSelectionChanged?: (id: string | undefined) => void;
};

export const MasterDetailTable = ({
  properties,
  data,
  detailsTransform,
  detailsPosition = 'right',
  onSelectionChanged,
}: MasterDetailTableProps) => {
  const [selected, setSelected] = useState<any | undefined>(undefined);
  const [transformedData, setTransformedData] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRowClicked = useCallback(
    (row: any) => {
      setSelected(row);
      onSelectionChanged?.(row.id);
    },
    [onSelectionChanged, setSelected],
  );

  useEffect(() => {
    if (!selected) {
      setTransformedData(undefined);
      return;
    }

    if (!detailsTransform) {
      setTransformedData(selected);
      return;
    }

    const result = detailsTransform(selected);
    if (result instanceof Promise) {
      setIsLoading(true);
      result
        .then((data) => {
          setTransformedData(data);
        })
        .catch((error) => {
          setTransformedData({ error: String(error) });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setTransformedData(result);
    }
  }, [selected, detailsTransform]);

  const gridLayout = useMemo(() => {
    if (detailsPosition === 'right') {
      return selected ? 'grid grid-cols-[4fr_3fr]' : 'grid grid-cols-[1fr_min-content]';
    } else {
      return selected ? 'grid grid-rows-[3fr_5fr]' : 'grid grid-rows-[1fr_min-content]';
    }
  }, [selected, detailsPosition]);

  return (
    <div className={mx('bs-full border-bs border-separator', gridLayout)}>
      <div>
        <DynamicTable data={data} properties={properties} onRowClicked={handleRowClicked} />
      </div>
      <div className={mx('overflow-auto text-sm ', detailsPosition === 'right' && 'border-separator border-is')}>
        {selected ? (
          isLoading ? (
            <p className={mx('font-mono text-xs p-1 ')}>Loading details...</p>
          ) : (
            <JsonView data={transformedData} />
          )
        ) : (
          <Placeholder label='Details' />
        )}
      </div>
    </div>
  );
};
