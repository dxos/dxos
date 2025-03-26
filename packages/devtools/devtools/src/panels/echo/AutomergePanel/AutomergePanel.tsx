//
// Copyright 2024 DXOS.org
//

import React, { useState, useMemo } from 'react';

import { type SpaceDoc } from '@dxos/echo-protocol';
import { FormatEnum } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { Toolbar } from '@dxos/react-ui';

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

type Data = {
  documentId: string;
  accessor: () => SpaceDoc;
  id: string;
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

  const properties = useMemo(
    () => [
      { name: 'documentId', format: FormatEnum.DID, size: 320 },
      { name: 'content', format: FormatEnum.String, size: 320 },
      { name: 'type', format: FormatEnum.String, size: 320 },
    ],
    [],
  );

  const data = useMemo(() => {
    return handles
      .map((handle) => {
        const doc = handle.docSync();
        return {
          id: handle.documentId,
          documentId: handle.documentId,
          content: isSpaceRoot(doc) ? 'space root doc' : getStoredObject(doc)?.id,
          type: getStoredObjectType({ documentId: handle.documentId, accessor: () => doc, id: handle.documentId }),
          accessor: () => doc,
        };
      })
      .filter(textFilter(filter));
  }, [handles, filter]);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <Searchbar onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable
        properties={properties}
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
