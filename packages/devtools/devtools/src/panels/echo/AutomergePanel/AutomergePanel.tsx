//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type SpaceDoc } from '@dxos/echo-protocol';
import { useClient } from '@dxos/react-client';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table/deprecated';

import { MasterDetailTable, PanelContainer, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const hasMatchRecursive = (object: any, pattern: RegExp): boolean => {
  if (!object) {
    return false;
  }
  if (typeof object !== 'object') {
    return Boolean(String(object).match(pattern));
  }
  if (Array.isArray(object)) {
    return object.some((element) => hasMatchRecursive(element, pattern));
  }
  return Object.values(object).some((element) => hasMatchRecursive(element, pattern));
};

const textFilter = (text?: string) => {
  if (!text?.length) {
    return () => true;
  }
  const pattern = new RegExp(text, 'i');
  return (item: Data) => {
    if (getStoredObjectType(item)?.toLowerCase()?.endsWith('canvas')) {
      return false;
    }
    return hasMatchRecursive(getStoredObject(item.accessor()), pattern);
  };
};

const getStoredObject = (doc: SpaceDoc | undefined): any => {
  const [[id, object]] = Object.entries(doc?.objects ?? {});
  return { id, object };
};

const getStoredObjectType = (data: Data): string | undefined => {
  return isSpaceRoot(data.accessor()) ? '' : getStoredObject(data.accessor())?.object?.system?.type?.['/'];
};

const { helper, builder } = createColumnBuilder<Data>();
const columns: TableColumnDef<Data>[] = [
  helper.accessor((handle) => handle.documentId, { id: 'documentId', ...builder.string() }),
  helper.accessor(({ accessor }) => (isSpaceRoot(accessor()) ? 'space root doc' : getStoredObject(accessor())?.id), {
    id: 'content',
    ...builder.string(),
  }),
  helper.accessor(getStoredObjectType, { id: 'type', ...builder.string() }),
];

type Data = {
  documentId: string;
  accessor: () => SpaceDoc;
};

export const AutomergePanel = () => {
  const { space } = useDevtoolsState();

  const client = useClient();
  const handles =
    (space &&
      client.spaces
        .get()
        .find((s) => s.id === space.id)
        ?.db?.coreDatabase?.getLoadedDocumentHandles()) ??
    [];

  const [filter, setFilter] = useState('');

  const data = handles
    .map((handle) => ({ documentId: handle.documentId, accessor: () => handle.docSync() }))
    .filter(textFilter(filter));

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <Searchbar onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<Data>
        columns={columns}
        data={data}
        statusBar={<div>Handles: {handles.length}</div>}
        detailsTransform={({ accessor }) => accessor()}
      />
    </PanelContainer>
  );
};

const isSpaceRoot = (accessor: SpaceDoc) => {
  return Object.keys(accessor?.links ?? {}).length > 0;
};
