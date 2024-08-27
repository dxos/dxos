//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoClient } from '@dxos/echo-db';
import { type SpaceDoc } from '@dxos/echo-protocol';
import { useClient } from '@dxos/react-client';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';

const { helper, builder } = createColumnBuilder<Data>();
const columns: TableColumnDef<Data>[] = [
  helper.accessor((handle) => handle.documentId, { id: 'documentId', ...builder.string() }),
  helper.accessor(({ accessor }) => Object.keys(accessor()?.objects ?? {})?.[0], {
    id: 'binded object',
    ...builder.string(),
  }),
];

type Data = {
  documentId: string;
  accessor: () => SpaceDoc;
};

export const AutomergePanel = () => {
  const client = useClient();
  const echoClient = (client.spaces as any).echoClient as EchoClient;
  const handles = [...echoClient.openDatabases].flatMap((db) => db.coreDatabase.getLoadedDocumentHandles());

  const data = handles.map((handle) => ({ documentId: handle.documentId, accessor: () => handle.docSync() }));

  return (
    <PanelContainer>
      <MasterDetailTable<Data>
        columns={columns}
        data={data}
        statusBar={<div>Handles: {handles.length}</div>}
        detailsTransform={({ accessor }) => accessor()}
      />
    </PanelContainer>
  );
};
