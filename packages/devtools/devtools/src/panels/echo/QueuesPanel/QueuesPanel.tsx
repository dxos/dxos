//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { DXN } from '@dxos/keys';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { createColumnBuilder, Table, type TableColumnDef } from '@dxos/react-ui-table/deprecated';
import { mx } from '@dxos/react-ui-theme';

import { PanelContainer, Searchbar } from '../../../components';
// import { DataSpaceSelector } from '../../../containers';
// import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

const { helper, builder } = createColumnBuilder<any>();
const columns: TableColumnDef<any, any>[] = [
  helper.accessor(
    'id',
    builder.string({
      header: 'id',
      accessorFn: (item) => trimId(item.id),
      size: 140,
      // TODO(dmaretskyi): font-mono doesn't work.
      meta: { cell: { classNames: ['font-mono'] } },
    }),
  ),
  helper.accessor((item) => item['@type'], {
    id: 'type',
    ...builder.string(),
  }),
];

export const QueuesPanel = () => {
  const edgeClient = useEdgeClient();
  // const { space } = useDevtoolsState();
  const [queueInput, setQueueInput] = useState('');
  const queueDxn = DXN.tryParse(queueInput);
  const queue = useQueue<any>(edgeClient, queueDxn);
  const [selected, setSelected] = useState<any>();
  const [selectedVersionObject, setSelectedVersionObject] = useState<any | null>(null);

  const objectSelect = (object: ReactiveEchoObject<any>) => {
    setSelectedVersionObject(null);
    setSelected(object);
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
        <Table.Root>
          <Table.Viewport asChild>
            <div className='flex-col divide-y'>
              <Table.Main<ReactiveEchoObject<any>>
                columns={columns}
                data={queue?.items ?? []}
                rowsSelectable
                currentDatum={selected}
                onDatumClick={objectSelect}
                fullWidth
              />
            </div>
          </Table.Viewport>
        </Table.Root>

        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selected ? (
            <ObjectDataViewer object={selectedVersionObject ?? selected} />
          ) : (
            'Select an object to inspect the contents'
          )}
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

const trimId = (id: ObjectId) => `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;

interface rendererNode {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof React.JSX.IntrinsicElements | React.ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: rendererNode[];
}
