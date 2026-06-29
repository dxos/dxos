//
// Copyright 2020 DXOS.org
//

import React, { type ComponentType, type JSX, useMemo, useState } from 'react';

import { Format } from '@dxos/echo/Format';
import { Toolbar } from '@dxos/react-ui';
import { JsonHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TableFeatures, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/ui-theme';

import { PanelContainer, Searchbar } from '../../../components';
// import { DataSpaceSelector } from '../../../containers';
// import { useDevtoolsState } from '../../../hooks';

export const QueuesPanel = () => {
  // const { space } = useDevtoolsState();
  const [_queueInput, setQueueInput] = useState('');
  // TODO(dmaretskyi): DXN-driven feed lookup removed; this panel is stubbed
  // pending a Feed.Feed-aware replacement.
  const objects: any[] = [];
  const [selected, setSelected] = useState<any>();
  const [selectedVersionObject, setSelectedVersionObject] = useState<any | null>(null);

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'id', format: Format.TypeFormat.DID, size: 320 },
      { name: 'type', format: Format.TypeFormat.JSON, title: 'type' },
    ],
    [],
  );

  const rows = useMemo(() => {
    return objects.map((item: any) => ({
      id: item.id,
      type: item['@type'],
      _original: item,
    }));
  }, [objects]);

  const handleRowClicked = (row: any) => {
    if (!row) {
      setSelected(undefined);
      return;
    }

    // Always pick the last item in the queue.
    const lastItem = objects[objects.length - 1];
    if (lastItem) {
      setSelectedVersionObject(null);
      setSelected(lastItem);
    }
  };

  const features: Partial<TableFeatures> = useMemo(() => ({ selection: { enabled: true, mode: 'single' } }), []);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {/* <DataSpaceSelector /> */}
          <Searchbar onChange={setQueueInput} />
        </Toolbar.Root>
      }
    >
      {/* TODO(burdon): Convert to MasterDetailTable. */}
      <div className='flex grow flex-col overflow-hidden divide-y divide-separator'>
        <DynamicTable rows={rows} properties={properties} features={features} onRowClick={handleRowClicked} />
        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selected && <ObjectDataViewer object={selectedVersionObject ?? selected} />}
        </div>
      </div>
    </PanelContainer>
  );
};

export type ObjectDataViewerProps = {
  object: any;
};

const ObjectDataViewer = ({ object }: ObjectDataViewerProps) => {
  const rowRenderer = ({
    rows,
    stylesheet,
    useInlineStyles,
  }: {
    rows: rendererNode[];
    stylesheet: any;
    useInlineStyles: any;
  }) => {
    return rows.map((row, index) => {
      return createElement({
        node: row,
        stylesheet,
        style: {},
        useInlineStyles,
        key: index,
      });
    });
  };

  return <JsonHighlighter data={object} renderer={rowRenderer} />;
};

interface rendererNode {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof JSX.IntrinsicElements | ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: rendererNode[];
}
