//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { AnchoredOverflow, Button, useFileDownload } from '@dxos/react-ui';
import { Table, type TableColumnDef, createColumnBuilder, textPadding } from '@dxos/react-ui-table/deprecated';

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

export const SpaceListPanel = ({ onSelect }: { onSelect?: (space: SpaceData | undefined) => void }) => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const setState = useDevtoolsDispatch();
  const download = useFileDownload();

  const handleSelect = (selection: SpaceData | undefined) => {
    const space = selection && spaces.find((space) => space.key.equals(selection.key));
    setState((state) => ({ ...state, space }));
    onSelect?.(selection);
  };

  const handleToggleOpen = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    if (space.isOpen) {
      await space.close();
    } else {
      await space.open();
    }
  };

  const handleSnapshot = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    await space.waitUntilReady();
    const backupBlob = await exportData(space);
    const filename = space.properties.name?.replace(/\W/g, '_') || space.key.toHex();

    download(backupBlob, `${filename}.json`);
  };

  const handleArchive = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    const archive = await space.internal.export();
    download(new Blob([archive.contents]), archive.filename);
  };

  const handleImport = async (backup: File) => {
    try {
      if (backup.type === 'application/json') {
        // Validate backup.
        const backupString = await backup.text();
        JSON.parse(backupString);

        // Import space.
        const space = await client.spaces.create();
        await space.waitUntilReady();
        await importData(space, backup);
        space.properties.name = space.properties.name + ' - IMPORTED';
      } else if (backup.type === 'application/x-tar') {
        const archive = {
          filename: backup.name,
          contents: new Uint8Array(await backup.arrayBuffer()),
        } satisfies SpaceArchive;
        await client.spaces.import(archive);
      } else {
        throw new Error('Invalid backup type');
      }
    } catch (err) {
      log.catch(err);
    }
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
        >
          {context.row.original.isOpen ? 'Close' : 'Open'}
        </Button>
      ),
      maxSize: 60,
    }),
    helper.display({
      id: 'snapshot',
      cell: (context) => (
        <Button
          onClick={(event) => {
            event.stopPropagation();
            void handleSnapshot(context.row.original.key);
          }}
          classNames='flex shrink-0 m-1'
        >
          Snapshot
        </Button>
      ),
      maxSize: 85,
    }),
    helper.display({
      id: 'archive',
      cell: (context) => (
        <Button
          onClick={(event) => {
            event.stopPropagation();
            void handleArchive(context.row.original.key);
          }}
          classNames='flex shrink-0 m-1'
        >
          Archive
        </Button>
      ),
    }),
  ];

  const data = spaces.map((space): SpaceData => {
    const { open, ready } = space.internal.data.metrics ?? {};
    return {
      key: space.key,
      name: space.isOpen ? space.properties.name : undefined,
      objects: -1, // TODO(dmaretskyi): Fix this.
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
