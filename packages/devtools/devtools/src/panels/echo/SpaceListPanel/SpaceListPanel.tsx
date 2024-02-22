//
// Copyright 2020 DXOS.org
//

import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Button, useFileDownload } from '@dxos/react-ui';
import { Table, type TableColumnDef, createColumnBuilder, textPadding } from '@dxos/react-ui-table';

import { DialogRestoreSpace } from './DialogRestoreSpace';
import { exportData, importData } from './backup';
import { PanelContainer } from '../../../components';
import { useDevtoolsDispatch } from '../../../hooks';

export const SpaceListPanel: FC = () => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const navigate = useNavigate();
  const setState = useDevtoolsDispatch();
  const download = useFileDownload();

  const handleSelect = (selection: Space | undefined) => {
    setState((state) => ({ ...state, space: selection, useHaloSpaceKey: false }));
    navigate('/echo/space');
  };

  const handleToggleOpen = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    if (space.isOpen) {
      await space.internal.close();
    } else {
      await space.internal.open();
    }
  };

  const handleBackup = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    await space.waitUntilReady();
    const backupBlob = await exportData(space);
    const filename = space.properties.name?.replace(/\W/g, '_') || space.key.toHex();

    download(backupBlob, `${filename}.json`);
  };

  const handleImport = async (backup: Blob) => {
    // Validate backup.
    try {
      const backupString = await backup.text();
      JSON.parse(backupString);
    } catch (err) {
      log.catch(err);
    }

    const space = await client.spaces.create();
    await space.waitUntilReady();
    await importData(space, backup);
    space.properties.name = space.properties.name + ' - IMPORTED';
  };

  // TODO(burdon): Get builder from hook.
  // TODO(dmaretskyi): Fix the types.
  const { helper, builder } = createColumnBuilder<any>();
  const columns: TableColumnDef<Space, any>[] = [
    helper.accessor('key', builder.key({ tooltip: true })),
    helper.accessor((space) => space.properties.name, {
      id: 'name',
      meta: { cell: { classNames: textPadding } },
    }) as any,
    helper.accessor((space) => space.db.objects.length, {
      id: 'objects',
      ...builder.number(),
    }),
    helper.accessor((space) => space.members.get().length, {
      id: 'members',
      ...builder.number(),
    }),
    helper.accessor(
      (space) => {
        const { open, ready } = space.internal.data.metrics ?? {};
        return open && ready && ready.getTime() - open.getTime();
      },
      {
        id: 'startup',
        ...builder.number({ size: 80 }),
      },
    ),
    helper.accessor('isOpen', { header: 'open', ...builder.icon() }),
    helper.display({
      id: 'open',
      cell: (context) => (
        <Button
          onClick={(event) => {
            event.stopPropagation();
            void handleToggleOpen(context.row.original.key);
          }}
          classNames='flex shrink-0 m-1'
          variant='primary'
        >
          {context.row.original.isOpen ? 'Close' : 'Open'}
        </Button>
      ),
      maxSize: 60,
    }),
    helper.display({
      id: 'backup',
      cell: (context) => (
        <Button
          onClick={(event) => {
            event.stopPropagation();
            void handleBackup(context.row.original.key);
          }}
          classNames='flex shrink-0 m-1'
        >
          {'Download backup'}
        </Button>
      ),
    }),
  ];

  return (
    <PanelContainer classNames='overflow-auto flex-1'>
      <DialogRestoreSpace handleFile={handleImport} />
      <Table<Space> columns={columns} data={spaces} onDatumClick={handleSelect} fullWidth />
    </PanelContainer>
  );
};
