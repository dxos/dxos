//
// Copyright 2020 DXOS.org
//

import React, { useMemo, useState, useCallback } from 'react';

import type { State as AmState } from '@dxos/automerge/automerge';
import { checkoutVersion, Filter, getEditHistory, type ReactiveEchoObject } from '@dxos/echo-db';
import { FormatEnum, getSchemaVersion } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { getSchema, getType, getTypename, isDeleted } from '@dxos/live-object';
import { QueryOptions, type Space, useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { PanelContainer, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

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

export const ObjectsPanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
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

  const objectProperties = useMemo(
    () => [
      { name: 'id', format: FormatEnum.DID },
      { name: 'type', format: FormatEnum.String },
      {
        name: 'deleted',
        format: FormatEnum.SingleSelect,
        size: 100,
        config: {
          options: [{ id: 'DELETED', title: 'DELETED', color: 'red' }],
        },
      },
      { name: 'version', format: FormatEnum.String, size: 100 },
      {
        name: 'schemaAvailable',
        format: FormatEnum.SingleSelect,
        size: 180,
        config: {
          options: [
            { id: 'YES', title: 'YES', color: 'green' },
            { id: 'NO', title: 'NO', color: 'red' },
          ],
        },
      },
    ],
    [],
  );

  const tableData = useMemo(() => {
    return items.filter(textFilter(filter)).map((item) => ({
      id: item.id,
      deleted: isDeleted(item) ? 'DELETED' : ' ',
      type: getTypename(item),
      version: getSchema(item) ? getSchemaVersion(getSchema(item)!) : undefined,
      schemaAvailable: getSchema(item) ? 'YES' : 'NO',
      _original: item, // Store the original item for selection
    }));
  }, [items, filter]);

  const handleObjectSelectionChanged = useCallback(
    (selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        setSelected(undefined);
        setSelectedVersion(null);
        setSelectedVersionObject(null);
        return;
      }

      const selectedId = selectedIds[selectedIds.length - 1];
      const selectedObject = items.find((item) => item.id === selectedId);

      if (selectedObject) {
        objectSelect(selectedObject);
      }
    },
    [items],
  );

  const historyProperties = useMemo(
    () => [
      { name: 'hash', format: FormatEnum.JSON },
      { name: 'actor', format: FormatEnum.JSON, size: 380 },
      // Uncomment when time and message are used
      // { name: 'time', format: FormatEnum.Number },
      // { name: 'message', format: FormatEnum.String },
    ],
    [],
  );
  const historyData = useMemo(() => {
    return history.map((item) => ({
      id: item.hash,
      hash: item.hash.slice(0, 8),
      actor: item.actor,
    }));
  }, [history, selectedVersion]);

  const handleHistorySelectionChanged = useCallback(
    (selectedHashes: string[]) => {
      if (selectedHashes.length === 0 || !selected) {
        setSelectedVersion(null);
        setSelectedVersionObject(null);
        return;
      }

      const selectedHash = selectedHashes[0];
      const versionItem = history.find((item) => item.hash.slice(0, 8) === selectedHash);

      if (versionItem) {
        onVersionClick(versionItem);
      }
    },
    [history, onVersionClick, selected],
  );

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <Searchbar onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <div className={mx('flex grow', 'flex-col divide-y', 'overflow-hidden', styles.border)}>
        <DynamicTable
          data={tableData}
          properties={objectProperties}
          onSelectionChanged={handleObjectSelectionChanged}
        />

        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selected ? (
            <ObjectDataViewer object={selectedVersionObject ?? selected} onNavigate={onNavigate} />
          ) : (
            'Select an object to inspect the contents'
          )}
        </div>
        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selected ? (
            <DynamicTable
              data={historyData}
              properties={historyProperties}
              onSelectionChanged={handleHistorySelectionChanged}
            />
          ) : (
            'Select an object to inspect the contents'
          )}
        </div>
      </div>
      <div
        className={mx(
          'bs-[--statusbar-size]',
          'flex justify-end items-center gap-2',
          'bg-baseSurface text-description',
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
    <SyntaxHighlighter classNames='text-sm' language='json' renderer={rowRenderer}>
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
