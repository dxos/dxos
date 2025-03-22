//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';
import { type MaybePromise } from '@dxos/util';

import { JsonView } from './JsonView';

export type MasterDetailTableProps = {
  properties: TablePropertyDefinition[];
  data: Array<{ id: string; [key: string]: any }>;
  statusBar?: ReactNode;
  detailsTransform?: (data: any) => MaybePromise<any>;
  detailsPosition?: 'bottom' | 'right';
  onSelectionChanged?: (id: string | undefined) => void;
};

export const MasterDetailTable = ({
  properties,
  data,
  statusBar,
  detailsTransform,
  detailsPosition = 'bottom',
  onSelectionChanged,
}: MasterDetailTableProps) => {
  const [selectedId, setSelectedId] = useState<string>();
  const [transformedData, setTransformedData] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const selected = useMemo(() => {
    return selectedId ? data.find((item) => item.id === selectedId) : undefined;
  }, [selectedId, data]);

  const handleSelectionChanged = useCallback(
    (selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        setSelectedId(undefined);
        onSelectionChanged?.(undefined);
      } else {
        setSelectedId(selectedIds[selectedIds.length - 1]);
        onSelectionChanged?.(selectedIds[selectedIds.length - 1]);
      }
    },
    [onSelectionChanged, setSelectedId],
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
          isLoading ? (
            <p className={mx('font-mono text-xs p-1')}>Loading details...</p>
          ) : (
            <JsonView data={transformedData} />
          )
        ) : (
          <p className={mx('font-mono text-xs p-1')}>Make a selection for details.</p>
        )}
      </div>
    </div>
  );
};
