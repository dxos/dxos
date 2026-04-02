//
// Copyright 2020 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { SpaceProperties } from '@dxos/client/echo';
import { Obj, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { useFileDownload } from '@dxos/react-ui';
import { DynamicTable, type TableFeatures, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { createFilename } from '@dxos/util';

import { PanelContainer } from '../../../components';
import { useDevtoolsDispatch } from '../../../hooks';

import { exportData, importData } from './backup';
import { DialogRestoreSpace } from './DialogRestoreSpace';

type SpaceData = {
  key: PublicKey;
  name: string;
  objects: number;
  members: number;
  startup: number;
  isOpen: boolean;
};

const rowActions = [
  { id: 'toggleOpen', label: 'Toggle space open closed' },
  { id: 'snapshot', label: 'Download space snapshot' },
  { id: 'archive', label: 'Download space archive' },
  { id: 'import', label: 'Import data into space' },
];

export const SpaceListPanel = ({ onSelect }: { onSelect?: (space: SpaceData | undefined) => void }) => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const setState = useDevtoolsDispatch();
  const download = useFileDownload();
  const [importTargetSpaceId, setImportTargetSpaceId] = useState<string | null>(null);

  const importTargetSpace = useMemo(() => {
    if (!importTargetSpaceId) {
      return null;
    }
    return spaces.find((space) => space.id === importTargetSpaceId) ?? null;
  }, [importTargetSpaceId, spaces]);

  const rows = useMemo(() => {
    return spaces.map((space) => {
      const { open, ready } = space.internal.data.metrics ?? {};
      return {
        id: space.id.toString(),
        name: space.isOpen ? space.properties.name : undefined,
        tags: space.tags.join(', '),
        objects: -1, // TODO(dmaretskyi): Fix this.
        members: space.members.get().length,
        startup: open && ready ? ready.getTime() - open.getTime() : -1,
        isOpen: space.isOpen,
      };
    });
  }, [spaces]);

  const handleRowClicked = useCallback(
    (row: any) => {
      if (!row) {
        return;
      }

      const selectedId = row.id;
      const space = spaces.find((space) => space.key.toString() === selectedId);
      setState((state) => ({ ...state, space }));
      onSelect?.(row._original);
    },
    [onSelect, setState, spaces],
  );

  const handleToggleOpen = useCallback(
    async (spaceId: string) => {
      const space = spaces.find((space) => space.id === spaceId)!;
      if (space.isOpen) {
        await space.close();
      } else {
        await space.open();
      }
    },
    [spaces],
  );

  const handleSnapshot = useCallback(
    async (spaceId: string) => {
      const space = spaces.find((space) => space.id === spaceId)!;
      await space.waitUntilReady();
      const backupBlob = await exportData(space);
      download(backupBlob, createFilename({ parts: [space.id], ext: 'json' }));
    },
    [download, spaces],
  );

  const handleArchive = useCallback(
    async (spaceId: string) => {
      const space = spaces.find((space) => space.id === spaceId)!;
      const archive = await space.internal.export();
      download(new Blob([archive.contents as Uint8Array<ArrayBuffer>]), archive.filename);
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
            Obj.change(space.properties, (obj) => {
              obj.name = obj.name + ' - IMPORTED';
            });
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
          Obj.change(space.properties, (obj) => {
            obj.name = obj.name + ' - IMPORTED';
          });
        }
      } catch (err) {
        log.catch(err);
      }
    },
    [client],
  );

  const handleImportIntoSpace = useCallback(
    async (backup: File) => {
      try {
        if (importTargetSpace) {
          await importTargetSpace.waitUntilReady();
          await importData(importTargetSpace, backup, { ignoreTypes: [Type.getTypename(SpaceProperties)] });
        }
      } catch (err) {
        log.catch(err);
      } finally {
        setImportTargetSpaceId(null);
      }
    },
    [importTargetSpace],
  );

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'id', format: Format.TypeFormat.DID },
      { name: 'name', format: Format.TypeFormat.String },
      { name: 'tags', format: Format.TypeFormat.String },
      { name: 'objects', format: Format.TypeFormat.Number, size: 120 },
      { name: 'members', format: Format.TypeFormat.Number, size: 120 },
      { name: 'startup', format: Format.TypeFormat.Number, size: 120 },
      { name: 'isOpen', format: Format.TypeFormat.Boolean, title: 'open?', size: 120 },
    ],
    [],
  );

  const handleRowAction = (actionId: string, item: any) => {
    const spaceId = item.id;
    if (actionId === 'toggleOpen') {
      void handleToggleOpen(spaceId);
    } else if (actionId === 'snapshot') {
      void handleSnapshot(spaceId);
    } else if (actionId === 'archive') {
      void handleArchive(spaceId);
    } else if (actionId === 'import') {
      const space = spaces.find((space) => space.id === spaceId);
      if (space?.isOpen) {
        setImportTargetSpaceId(spaceId);
      }
    }
  };

  const features: Partial<TableFeatures> = useMemo(() => ({ selection: { enabled: true, mode: 'single' } }), []);

  return (
    <PanelContainer classNames='overflow-auto flex-1'>
      {/* TODO(burdon): This should not be a dialog. */}
      <DialogRestoreSpace
        {...(importTargetSpaceId !== null
          ? {
              open: true,
              onOpenChange: (nextOpen: boolean) => {
                if (!nextOpen) {
                  setImportTargetSpaceId(null);
                }
              },
              spaceName: importTargetSpace?.isOpen
                ? (importTargetSpace.properties.name ?? importTargetSpace.id)
                : undefined,
              handleFile: handleImportIntoSpace,
            }
          : {
              handleFile: handleImport,
            })}
      />
      <DynamicTable
        properties={properties}
        rows={rows}
        features={features}
        rowActions={rowActions}
        onRowClick={handleRowClicked}
        onRowAction={handleRowAction}
      />
    </PanelContainer>
  );
};
