//
// Copyright 2020 DXOS.org
//

import type { State as AmState } from '@automerge/automerge';
import React, { useCallback, useMemo, useState } from 'react';

import { type DXN, Filter, Format, Obj, Query, Type } from '@dxos/echo';
import { type AnyLiveObject, checkoutVersion, getEditHistory } from '@dxos/echo-db';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { DynamicTable, type TableFeatures } from '@dxos/react-ui-table';
import { mx } from '@dxos/ui-theme';

import { ObjectViewer, PanelContainer, Placeholder, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: AnyLiveObject<any>) => {
    let match = false;
    match ||= !!Obj.getTypename(item)?.match(matcher);
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
  const items = useQuery(space?.db, Query.select(Filter.everything()).options({ deleted: 'include' }));
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<AnyLiveObject<any>>();
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

  const objectSelect = (object: AnyLiveObject<any>) => {
    setSelectedVersionObject(null);
    setSelected(object);
  };

  const history = useMemo(() => {
    // It's better for performance to materialize all changes here in one loop.
    return selected ? getEditHistory(selected).map(mapHistoryRow) : [];
  }, [selected]);

  const dataProperties = useMemo(
    () => [
      { name: 'id', format: Format.TypeFormat.DID },
      { name: 'type', format: Format.TypeFormat.String },
      { name: 'version', format: Format.TypeFormat.String, size: 100 },
      {
        name: 'deleted',
        format: Format.TypeFormat.SingleSelect,
        size: 100,
        config: {
          options: [{ id: 'DELETED', title: 'DELETED', color: 'red' }],
        },
      },
      {
        name: 'schemaAvailable',
        format: Format.TypeFormat.SingleSelect,
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

  const dataRows = useMemo(() => {
    return items.filter(textFilter(filter)).map((item) => ({
      id: item.id,
      type: Obj.getTypename(item),
      version: Obj.getSchema(item) ? Type.getVersion(Obj.getSchema(item)!) : undefined,
      deleted: Obj.isDeleted(item) ? 'DELETED' : ' ',
      schemaAvailable: Obj.getSchema(item) ? 'YES' : 'NO',
      _original: item, // Store the original item for selection
    }));
  }, [items, filter]);

  const handleObjectRowClicked = useCallback((row: any) => {
    if (!row) {
      setSelected(undefined);
      setSelectedVersion(null);
      setSelectedVersionObject(null);
      return;
    }

    objectSelect(row._original);
  }, []);

  const historyProperties = useMemo(
    () => [
      { name: 'hash', format: Format.TypeFormat.JSON },
      { name: 'actor', format: Format.TypeFormat.JSON, size: 380 },
      // Uncomment when time and message are used
      // { name: 'time', format: Format.TypeFormat.Number },
      // { name: 'message', format: Format.TypeFormat.String },
    ],
    [],
  );

  const historyRows = useMemo(() => {
    return history.map((item) => ({
      id: item.hash,
      hash: item.hash.slice(0, 8),
      actor: item.actor,
    }));
  }, [history, selectedVersion]);

  const handleVersionClick = useCallback(
    (version: HistoryRow) => {
      setSelectedVersion(version);
      setSelectedVersionObject(checkoutVersion(selected!, [version.hash]));
    },
    [selected],
  );

  const handleHistoryRowClicked = useCallback(
    (row: any) => {
      if (!row || !selected) {
        setSelectedVersion(null);
        setSelectedVersionObject(null);
        return;
      }

      const versionItem = history.find((item) => item.hash === row.id);

      if (versionItem) {
        handleVersionClick(versionItem);
      }
    },
    [history, handleVersionClick, selected],
  );

  const features: Partial<TableFeatures> = useMemo(() => ({ selection: { enabled: true, mode: 'single' } }), []);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <Searchbar placeholder='Filter...' onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <div className='bs-full grid grid-cols-[4fr_3fr] overflow-hidden'>
        <div className='flex flex-col is-full overflow-hidden'>
          <DynamicTable
            properties={dataProperties}
            rows={dataRows}
            features={features}
            onRowClick={handleObjectRowClicked}
          />
          <div
            className={mx(
              'bs-[--statusbar-size]',
              'flex shrink-0 justify-end items-center gap-2',
              'bg-baseSurface text-description',
            )}
          >
            <div className='text-sm pie-2'>Objects: {items.length}</div>
          </div>
        </div>

        <div className='min-bs-0 bs-full grid grid-rows-[1fr_16rem] !border-separator border-is border-bs'>
          <div className={mx('p-1 min-bs-0 overflow-auto')}>
            {selected ? (
              <ObjectViewer
                object={selectedVersionObject ?? selected}
                id={Obj.getDXN(selected)?.toString()}
                onNavigate={onNavigate}
              />
            ) : (
              <Placeholder label='Data' />
            )}
          </div>
          <div className={mx(!selected && 'p-1 border-bs !border-separator')}>
            {selected ? (
              <DynamicTable properties={historyProperties} rows={historyRows} onRowClick={handleHistoryRowClicked} />
            ) : (
              <Placeholder label='History' />
            )}
          </div>
        </div>
      </div>
    </PanelContainer>
  );
};
