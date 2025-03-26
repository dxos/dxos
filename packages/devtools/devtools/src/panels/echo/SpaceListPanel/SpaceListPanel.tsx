//
// Copyright 2020 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { useFileDownload } from '@dxos/react-ui';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

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
  const initialSelectRef = React.useRef(true);

  const tableData = useMemo(() => {
    return spaces.map((space) => {
      const { open, ready } = space.internal.data.metrics ?? {};
      return {
        id: space.key.toString(),
        key: space.key.toString(),
        name: space.isOpen ? space.properties.name : undefined,
        objects: -1, // TODO(dmaretskyi): Fix this.
        members: space.members.get().length,
        startup: open && ready ? ready.getTime() - open.getTime() : -1,
        isOpen: space.isOpen,
        _original: {
          key: space.key,
          name: space.isOpen ? space.properties.name : undefined,
          objects: -1,
          members: space.members.get().length,
          startup: open && ready ? ready.getTime() - open.getTime() : -1,
          isOpen: space.isOpen,
        },
      };
    });
  }, [spaces]);

  const handleSelect = useCallback(
    (selectedItems: string[]) => {
      // Skip the first automatic selection on mount
      if (initialSelectRef.current) {
        initialSelectRef.current = false;
        return;
      }

      if (selectedItems.length === 0) {
        return;
      }

      const selectedId = selectedItems[0];
      const space = spaces.find((space) => space.key.toString() === selectedId);
      setState((state) => ({ ...state, space }));
      const spaceData = tableData.find((data) => data.id === selectedId);
      onSelect?.(spaceData?._original);
    },
    [onSelect, setState, spaces, tableData],
  );

  const handleToggleOpen = useCallback(
    async (spaceKey: PublicKey) => {
      const space = spaces.find((space) => space.key.equals(spaceKey))!;
      if (space.isOpen) {
        await space.close();
      } else {
        await space.open();
      }
    },
    [spaces],
  );

  const handleBackup = useCallback(
    async (spaceKey: PublicKey) => {
      const space = spaces.find((space) => space.key.equals(spaceKey))!;
      await space.waitUntilReady();
      const backupBlob = await exportData(space);
      const filename = space.properties.name?.replace(/\W/g, '_') || space.key.toHex();

      download(backupBlob, `${filename}.json`);
    },
    [download, spaces],
  );

  const handleArchive = useCallback(
    async (spaceKey: PublicKey) => {
      const space = spaces.find((space) => space.key.equals(spaceKey))!;
      const archive = await space.internal.export();
      download(new Blob([archive.contents]), archive.filename);
    },
    [download, spaces],
  );

  const handleImport = useCallback(
    async (backup: File | Blob) => {
      try {
        if (backup instanceof File) {
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
        } else {
          // For Blob type
          const backupString = await backup.text();
          JSON.parse(backupString);

          const space = await client.spaces.create();
          await space.waitUntilReady();
          await importData(space, backup);
          space.properties.name = space.properties.name + ' - IMPORTED';
        }
      } catch (err) {
        log.catch(err);
      }
    },
    [client],
  );

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'key', format: FormatEnum.DID },
      { name: 'name', format: FormatEnum.String },
      { name: 'objects', format: FormatEnum.Number, size: 120 },
      { name: 'members', format: FormatEnum.Number, size: 120 },
      { name: 'startup', format: FormatEnum.Number, size: 120 },
      { name: 'isOpen', format: FormatEnum.Boolean, title: 'open?', size: 120 },
    ],
    [],
  );

  const handleRowAction = (actionId: string, item: any) => {
    const spaceKey = item._original.key;
    if (actionId === 'toggleOpen') {
      void handleToggleOpen(spaceKey);
    } else if (actionId === 'backup') {
      void handleBackup(spaceKey);
    } else if (actionId === 'archive') {
      void handleArchive(spaceKey);
    }
  };

  return (
    <PanelContainer classNames='overflow-auto flex-1'>
      <DialogRestoreSpace handleFile={handleImport} />
      <DynamicTable
        properties={properties}
        data={tableData}
        onSelectionChanged={handleSelect}
        rowActions={[
          { id: 'toggleOpen', translationKey: 'toggle space open closed label' },
          { id: 'backup', translationKey: 'download space backup label' },
          { id: 'archive', translationKey: 'download space archive label' },
        ]}
        onRowAction={handleRowAction}
      />
    </PanelContainer>
  );
};
