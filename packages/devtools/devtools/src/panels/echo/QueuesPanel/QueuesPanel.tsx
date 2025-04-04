//
// Copyright 2020 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { useQueue } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { PanelContainer, Searchbar } from '../../../components';
// import { DataSpaceSelector } from '../../../containers';
// import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

export const QueuesPanel = () => {
  // const { space } = useDevtoolsState();
  const [queueInput, setQueueInput] = useState('');
  const queueDxn = DXN.tryParse(queueInput);
  const queue = useQueue<any>(queueDxn);
  const [selected, setSelected] = useState<any>();
  const [selectedVersionObject, setSelectedVersionObject] = useState<any | null>(null);

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'id', format: FormatEnum.DID, size: 320 },
      { name: 'type', format: FormatEnum.JSON, title: 'type' },
    ],
    [],
  );

  const tableData = useMemo(() => {
    return (queue?.items ?? []).map((item: any) => ({
      id: item.id,
      type: item['@type'],
      _original: item,
    }));
  }, [queue?.items]);

  const handleRowClicked = (row: any) => {
    if (!row) {
      setSelected(undefined);
      return;
    }

    // Always pick the last item in the queue
    const lastItem = queue?.items[queue?.items.length - 1];
    if (lastItem) {
      setSelectedVersionObject(null);
      setSelected(lastItem);
    }
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {/* <DataSpaceSelector /> */}
          <Searchbar onChange={setQueueInput} />
        </Toolbar.Root>
      }
    >
      <div className={mx('flex grow', 'flex-col divide-y', 'overflow-hidden', styles.border)}>
        <DynamicTable properties={properties} data={tableData} onRowClicked={handleRowClicked} />
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
  const text = JSON.stringify(object, null, 2);

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

  return (
    <SyntaxHighlighter language='json' renderer={rowRenderer}>
      {text}
    </SyntaxHighlighter>
  );
};

interface rendererNode {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof React.JSX.IntrinsicElements | React.ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: rendererNode[];
}
