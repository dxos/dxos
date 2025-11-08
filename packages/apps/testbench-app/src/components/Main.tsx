//
// Copyright 2024 DXOS.org
//

import { randSentence, randWord } from '@ngneat/falso'; // TODO(burdon): Reconcile with echo-generator.
import type * as Schema from 'effect/Schema';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { Devtools, StatsPanel, useStats } from '@dxos/devtools';
import { Obj, Type } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type PublicKey, useClient } from '@dxos/react-client';
import { Query, type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect, useFileDownload } from '@dxos/react-ui';

import { Document, Item } from '../data';
import { defs } from '../defs';
import { exportData, importData } from '../util';

import { AppToolbar } from './AppToolbar';
import { DataToolbar, type DataView } from './DataToolbar';
import { ItemList } from './ItemList';
import { ItemTable } from './ItemTable';
import { SpaceToolbar } from './SpaceToolbar';
import { StatusBar } from './status';

export const Main = () => {
  const client = useClient();
  // Filter default so that the first space visible is the shared space.
  const spaces = useSpaces({ all: true }).filter((space) => space !== client.spaces.default);
  const [space, setSpace] = useState<Space>();
  useEffect(() => {
    if (!space && spaces.length) {
      setSpace(spaces[0]);
    }
  }, [spaces.length]);

  const [showDevTools, setShowDevTools] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, refreshStats] = useStats();

  const [view, setView] = useState<DataView>();
  const [type, setType] = useState<string>();
  const [filter, setFilter] = useState<string>();
  const [flushing, setFlushing] = useState(false);
  const flushingPromise = useRef<Promise<void>>(null);
  const download = useFileDownload();

  // TODO(burdon): [BUG]: Shows deleted objects.
  // TODO(burdon): Remove restricted list of objects.
  const typeMap = useMemo(
    () =>
      [Item, Document].reduce((map, type) => {
        map.set(Type.getTypename(type), type);
        return map;
      }, new Map<string, Schema.Schema<any>>()),
    [],
  );

  const getSchema = (type: string | undefined) => typeMap.get(type ?? Item.typename) ?? Item;
  const objectsOfSchema = useQuery(space, Query.type(getSchema(type)));
  const objects = useMemo(
    () => objectsOfSchema.filter((object) => match(filter, object.content)),
    [objectsOfSchema, filter],
  );

  const identity = client.halo.identity.get();

  // Handle invitation.
  useAsyncEffect(async () => {
    const url = new URL(window.location.href);
    const invitationCode = url.searchParams.get('spaceInvitationCode');
    if (invitationCode && identity) {
      const { space } = await client.shell.joinSpace({ invitationCode });
      setSpace(space);

      url.searchParams.delete('spaceInvitationCode');
      history.replaceState({}, document.title, url.href);
    }
  }, [identity]);

  const handleObjectCreate = (n = 1) => {
    if (!space) {
      return;
    }

    // TODO(burdon): Migrate generator from DebugPlugin.
    Array.from({ length: n }).forEach(() => {
      let object: Live<any>;
      switch (type) {
        case Document.typename: {
          object = Obj.make(Document, {
            title: randWord(),
            content: randSentence(),
          });
          break;
        }

        case Item.typename:
        default: {
          object = Obj.make(Item, {
            content: randSentence(),
            // due: randBetweenDate(dateRange)
          });
          break;
        }
      }

      space.db.add(object);
    });

    setFlushing(true);
    const promise = space.db.flush();
    flushingPromise.current = promise;
    promise.then(
      () => {
        if (flushingPromise.current === promise) {
          setFlushing(false);
        }
      },
      (err) => {
        log.catch(err);
      },
    );
  };

  const handleObjectDelete = (id: string) => {
    if (!space) {
      return;
    }

    // TODO(burdon): [API]: Rename delete and just provide ID?
    const object = space.db.getObjectById(id);
    if (object) {
      space.db.remove(object);
    }
  };

  const handleSpaceCreate = async () => {
    const space = await client.spaces.create();
    setSpace(space);
  };

  const handleSpaceImport = async (backup: Blob) => {
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
  };

  const handleSpaceSelect = (spaceKey?: PublicKey) => {
    const space = spaceKey ? client.spaces.get(spaceKey) : undefined;
    setSpace(space);
  };

  const handleSpaceToggleOpen = async (spaceKey: PublicKey) => {
    const space = client.spaces.get(spaceKey);
    if (space) {
      await (space.isOpen ? space.close() : space.open());
    }
  };

  const handleSpaceExport = async (spaceKey: PublicKey) => {
    const space = client.spaces.get(spaceKey);
    if (space) {
      await space.waitUntilReady();
      const backupBlob = await exportData(space);
      const filename = space.properties.name?.replace(/\W/g, '_') || space.key.toHex();
      download(backupBlob, `${filename}.json`);
    }
  };

  const handleSpaceInvite = (spaceKey: PublicKey) => {
    const space = client.spaces.get(spaceKey);
    if (!space) {
      return;
    }

    void client.shell.shareSpace({ spaceKey });
  };

  return (
    <div className='flex flex-row grow justify-center overflow-hidden'>
      <div className='flex flex-col grow bg-baseSurface'>
        <AppToolbar
          onHome={() => window.open(defs.issueUrl, 'DXOS')}
          onProfile={() => {
            void client.shell.open();
          }}
          onDevtools={() => setShowDevTools((showDevTools) => !showDevTools)}
        />
        <SpaceToolbar
          spaces={spaces}
          selected={space?.key ?? spaces[0]?.key}
          onCreate={handleSpaceCreate}
          onSelect={handleSpaceSelect}
          onToggleOpen={handleSpaceToggleOpen}
          onInvite={handleSpaceInvite}
          onImport={handleSpaceImport}
          onExport={handleSpaceExport}
        />
        <div className='flex flex-col grow overflow-hidden'>
          <DataToolbar
            types={Array.from(typeMap.keys())}
            onAdd={handleObjectCreate}
            onTypeChange={(type) => setType(type)}
            onFilterChange={setFilter}
            onViewChange={(view) => setView(view)}
          />

          {view === 'table' && <ItemTable schema={getSchema(type)} objects={objects} />}
          {view === 'list' && <ItemList objects={objects} onDelete={handleObjectDelete} />}
          {view === 'debug' && <ItemList debug objects={objects} onDelete={handleObjectDelete} />}
        </div>
        <div className='flex h-[32px] p-2 items-center relative text-xs'>
          <div>{objects.length} objects</div>
          <div className='grow' />
          <StatusBar flushing={flushing} showStats={showStats} onShowStats={(show) => setShowStats(show)} />
          {showStats && (
            <div className='z-20 absolute right-0 bottom-[32px] w-[450px] border-l border-t border-neutral-500 dark:border-neutral-800'>
              <StatsPanel stats={stats} onRefresh={refreshStats} />
            </div>
          )}
        </div>
      </div>
      {showDevTools && (
        <div className='flex flex-col w-[120rem] bs-full bg-white dark:bg-black'>
          <Suspense fallback={<></>}>
            <Devtools noRouter />
          </Suspense>
        </div>
      )}
    </div>
  );
};

const match = (filter: string | undefined, text: string | undefined) => {
  if (!filter?.length) {
    return true;
  }

  if (!text?.length) {
    return false;
  }

  const content = text.toLowerCase();
  const words = filter.split(/\s+/).map((word: string) => word.toLowerCase());
  return !words.some((word) => content.indexOf(word) === -1);
};
