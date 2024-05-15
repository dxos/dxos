//
// Copyright 2020 DXOS.org
//

import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { AnchoredOverflow, Button, useFileDownload } from '@dxos/react-ui';
import { Table, type TableColumnDef, createColumnBuilder, textPadding } from '@dxos/react-ui-table';

import { DialogRestoreSpace } from './DialogRestoreSpace';
import { exportData, importData } from './backup';
import { PanelContainer } from '../../../components';
import { useDevtoolsDispatch } from '../../../hooks';

type SpaceData = {
  key: PublicKey;
  name: string;
  objects: number;
  members: number;
  startup: number;
  isOpen: boolean;
};

export const SpaceListPanel: FC = () => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const navigate = useNavigate();
  const setState = useDevtoolsDispatch();
  const download = useFileDownload();

  const handleSelect = (selection: SpaceData | undefined) => {
    const space = selection && spaces.find((space) => space.key.equals(selection.key));
    setState((state) => ({ ...state, space }));
    navigate('/echo/space');
  };

  const handleToggleOpen = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    if (space.isOpen) {
      await space.close();
    } else {
      await space.open();
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
  const columns: TableColumnDef<SpaceData, any>[] = [
    helper.accessor('key', builder.key({ tooltip: true })),
    helper.accessor('name', {
      meta: { cell: { classNames: textPadding } },
    }) as any,
    helper.accessor('objects', {
      ...builder.number(),
    }),
    helper.accessor('members', {
      ...builder.number(),
    }),
    helper.accessor('startup', {
      ...builder.number({ size: 80 }),
    }),
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

  const data = spaces.map((space): SpaceData => {
    const { open, ready } = space.internal.data.metrics ?? {};
    return {
      key: space.key,
      name: space.isOpen ? space.properties.name : undefined,
      objects: space.db.objects.length,
      members: space.members.get().length,
      startup: open && ready ? ready.getTime() - open.getTime() : -1,
      isOpen: space.isOpen,
    };
  });

  return (
    <PanelContainer classNames='overflow-auto flex-1'>
      <DialogRestoreSpace handleFile={handleImport} />

      <Table.Root>
        <Table.Viewport classNames='overflow-anchored'>
          <Table.Main<SpaceData> columns={columns} data={data} onDatumClick={handleSelect} fullWidth />
          <AnchoredOverflow.Anchor />
        </Table.Viewport>
      </Table.Root>
    </PanelContainer>
  );
};
