//
// Copyright 2020 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { checkoutVersion, Filter, getEditHistory, type ReactiveEchoObject } from '@dxos/echo-db';
import { getSchema, getType, getTypename, isDeleted } from '@dxos/live-object';
import { QueryOptions, useQuery } from '@dxos/react-client/echo';
import { AnchoredOverflow, Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table/deprecated';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import type { State as AmState } from '@dxos/automerge/automerge';

import { getSchemaVersion, type ObjectId } from '@dxos/echo-schema';
import { mx } from '@dxos/react-ui-theme';
import { JsonView, PanelContainer, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';
import { DXN } from '@dxos/keys';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: ReactiveEchoObject<any>) => {
    let match = false;
    match ||= !!getType(item)?.objectId.match(matcher);
    match ||= !!String((item as any).title ?? '').match(matcher);
    return match;
  };
};

const { helper, builder } = createColumnBuilder<ReactiveEchoObject<any>>();
const columns: TableColumnDef<ReactiveEchoObject<any>, any>[] = [
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
  helper.accessor((item) => (isDeleted(item) ? '❌' : ' '), {
    id: 'deleted',
    size: 80,
    meta: { cell: { classNames: [textPadding, 'text-center'] } },
  }),
  helper.accessor((item) => getTypename(item), {
    id: 'type',
    ...builder.string(),
  }),
  helper.accessor((item) => (getSchema(item) ? getSchemaVersion(getSchema(item)!) : undefined), {
    id: 'version',
    size: 80,
    ...builder.string(),
  }),
  helper.accessor((item) => (!!getSchema(item) ? 'YES' : 'NO'), {
    id: 'Schema Available',
    ...builder.string(),
    size: 80,
  }),
];

type HistoryRow = {
  hash: string;
  actor: string;
  time: number;
  message: string | null;
};

const mapHistoryRow = (item: AmState<any>): HistoryRow => {
  return {
    hash: item.change.hash,
    actor: item.change.actor,
    time: item.change.time,
    message: item.change.message,
  };
};

const cb = createColumnBuilder<HistoryRow>();
const historyColumns: TableColumnDef<HistoryRow, any>[] = [
  cb.helper.accessor((item) => item.hash.slice(0, 8), {
    ...cb.builder.string(),
    header: 'Hash',
    size: 80,
  }),
  // TODO(dmaretskyi): Correlate with identity.
  cb.helper.accessor((item) => item.actor, {
    ...cb.builder.string(),
    header: 'Author (Actor ID)',
    size: 80,
  }),
  // Currently not set.
  // cb.helper.accessor((item) => item.time, {
  //   ...cb.builder.number(),
  //   header: 'Timestamp',
  //   size: 80,
  // }),
  // cb.helper.accessor((item) => item.message, {
  //   ...cb.builder.string(),
  //   header: 'Message',
  //   size: 80,
  // }),
];

export const ObjectsPanel = () => {
  const { space } = useDevtoolsState();
  // TODO(burdon): Sort by type?
  const items = useQuery(space, Filter.all(), { deleted: QueryOptions.ShowDeletedOption.SHOW_DELETED });
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<ReactiveEchoObject<any>>();
  const [selectedVersion, setSelectedVersion] = useState<HistoryRow | null>(null);
  const [selectedVersionObject, setSelectedVersionObject] = useState<any | null>(null);

  const onNavigate = (dxn: DXN) => {
    if (dxn.isLocalObjectId()) {
      const [, id] = dxn.parts;
      const object = items.find((item) => item.id === id);
      if (object) {
        setSelectedVersionObject(null);
        setSelected(object);
      }
    }
  };

  const objectSelect = (object: ReactiveEchoObject<any>) => {
    setSelectedVersionObject(null);
    setSelected(object);
  };

  const history = useMemo(() => {
    // It's better for performance to materialize all changes here in one loop.
    return selected ? getEditHistory(selected).map(mapHistoryRow) : [];
  }, [selected]);

  const onVersionClick = (version: HistoryRow) => {
    setSelectedVersion(version);
    setSelectedVersionObject(checkoutVersion(selected!, [version.hash]));
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <Searchbar onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <div className={mx('flex grow', 'flex-col divide-y', 'overflow-hidden', styles.border)}>
        <Table.Root>
          <Table.Viewport asChild>
            <div className='flex-col divide-y'>
              <Table.Main<ReactiveEchoObject<any>>
                columns={columns}
                data={items.filter(textFilter(filter))}
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
            <ObjectDataViewer object={selectedVersionObject ?? selected} onNavigate={onNavigate} />
          ) : (
            'Select an object to inspect the contents'
          )}
        </div>
        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selected ? (
            <>
              <Table.Root>
                <Table.Viewport asChild>
                  <div className='flex-col divide-y'>
                    <Table.Main<HistoryRow>
                      columns={historyColumns}
                      data={history}
                      rowsSelectable
                      currentDatum={selectedVersion ?? undefined}
                      onDatumClick={onVersionClick}
                      fullWidth
                    />
                  </div>
                </Table.Viewport>
              </Table.Root>
            </>
          ) : (
            'Select an object to inspect the contents'
          )}
        </div>
      </div>
      <div
        className={mx(
          'bs-[--statusbar-size]',
          'flex justify-end items-center gap-2',
          'bg-base text-description',
          'border-bs border-separator',
          'text-lg pointer-fine:text-xs',
        )}
      >
        <div>Objects: {items.length}</div>
      </div>
    </PanelContainer>
  );
};

export type ObjectDataViewerProps = {
  object: ReactiveEchoObject<any>;
  onNavigate: (dxn: DXN) => void;
};

const ObjectDataViewer = ({ object, onNavigate }: ObjectDataViewerProps) => {
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
    /**
     * Changes the "dxn:..." span to an anchor tag that navigates to the object.
     */
    const addDxnLinks = (node: rendererNode) => {
      if (isDxnSpanNode(node)) {
        node.tagName = 'a';
        node.properties ??= { className: [] };
        node.properties.className.push('underline', 'cursor-pointer');
        node.properties.onClick = () => {
          onNavigate(DXN.parse((node.children![0].value as string).slice(1, -1)));
        };
      } else {
        node.children?.forEach(addDxnLinks);
      }
    };

    rows.forEach(addDxnLinks);

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

const isDxnSpanNode = (node: rendererNode) => {
  return (
    node.type === 'element' &&
    node.tagName === 'span' &&
    node.children?.length === 1 &&
    node.children[0].type === 'text' &&
    typeof node.children[0].value === 'string' &&
    node.children[0].value.match(/^"(dxn:[^"]+)"$/)
  );
};
