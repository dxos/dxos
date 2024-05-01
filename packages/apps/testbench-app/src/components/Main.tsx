//
// Copyright 2024 DXOS.org
//

import { randWord, randSentence } from '@ngneat/falso'; // TODO(burdon): Reconcile with echo-generator.
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ReactiveObject, type S } from '@dxos/echo-schema';
import { create } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type PublicKey, useClient } from '@dxos/react-client';
import { type Space, useQuery, Filter, useSpaces } from '@dxos/react-client/echo';

import { AppToolbar } from './AppToolbar';
import { DataToolbar, type DataView } from './DataToolbar';
import { ItemList } from './ItemList';
import { ItemTable } from './ItemTable';
import { SpaceToolbar } from './SpaceToolbar';
import { StatusBar } from './status';
import { ItemType, DocumentType } from '../data';
import { defs } from '../defs';
// TODO(burdon): [API]: Import syntax?

// const dateRange = {
//   from: new Date(),
//   to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
// };

export const Main = () => {
  const client = useClient();
  // TODO(wittjosiah): Why filter out the default space?
  const spaces = useSpaces({ all: true }).filter((space) => space !== client.spaces.default);
  const [space, setSpace] = useState<Space>();

  useEffect(() => {
    if (!space && spaces.length) {
      setSpace(spaces[0]);
    }
  }, []);

  const [view, setView] = useState<DataView>();
  const [type, setType] = useState<string>();
  const [filter, setFilter] = useState<string>();
  const [flushing, setFlushing] = useState(false);
  const flushingPromise = useRef<Promise<void>>();

  // TODO(burdon): [BUG]: Shows deleted objects.
  // TODO(burdon): Remove restricted list of objects.
  const typeMap = useMemo(
    () =>
      [ItemType, DocumentType].reduce((map, type) => {
        map.set(type.typename, type);
        return map;
      }, new Map<string, S.Schema<any>>()),
    [],
  );
  const getSchema = (type: string | undefined) => typeMap.get(type ?? ItemType.typename) ?? ItemType;

  const objects = useQuery(
    space,
    Filter.schema(getSchema(type), (object: ItemType) => match(filter, object.content)),
    {},
    [type, filter],
  );

  // Handle invitation.
  useEffect(() => {
    const url = new URL(window.location.href);
    const invitationCode = url.searchParams.get('spaceInvitationCode');
    let t: ReturnType<typeof setTimeout>;
    if (invitationCode) {
      t = setTimeout(async () => {
        const { space } = await client.shell.joinSpace({ invitationCode });
        setSpace(space);

        url.searchParams.delete('spaceInvitationCode');
        history.replaceState({}, document.title, url.href);
      });
    }

    return () => clearTimeout(t);
  }, []);

  const handleObjectCreate = (n = 1) => {
    if (!space) {
      return;
    }

    // TODO(burdon): Migrate generator from DebugPlugin.
    Array.from({ length: n }).forEach(() => {
      let object: ReactiveObject<any>;
      switch (type) {
        case DocumentType.typename:
          object = create(DocumentType, {
            title: randWord(),
            content: randSentence(),
          });
          break;

        case ItemType.typename:
        default:
          object = create(ItemType, {
            content: randSentence(),
            // due: randBetweenDate(dateRange)
          });
          break;
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

  const handleSpaceToggleOpen = async (spaceKey: PublicKey) => {
    const space = client.spaces.get(spaceKey);
    if (space) {
      await (space.isOpen ? space.close() : space.open());
    }
  };

  const handleSpaceSelect = (spaceKey?: PublicKey) => {
    const space = spaceKey ? client.spaces.get(spaceKey) : undefined;
    setSpace(space);
  };

  const handleSpaceInvite = (spaceKey: PublicKey) => {
    const space = client.spaces.get(spaceKey);
    if (!space) {
      return;
    }

    void client.shell.shareSpace({ spaceKey });
  };

  return (
    <div className='flex flex-col grow max-w-[60rem] shadow-lg bg-white dark:bg-black divide-y'>
      <AppToolbar
        onHome={() => window.open(defs.issueUrl, 'DXOS')}
        onProfile={() => {
          void client.shell.open();
        }}
      />
      <SpaceToolbar
        spaces={spaces}
        selected={space?.key ?? spaces[0]?.key}
        onCreate={handleSpaceCreate}
        onToggleOpen={handleSpaceToggleOpen}
        onSelect={handleSpaceSelect}
        onInvite={handleSpaceInvite}
      />
      <div className='flex flex-col grow overflow-hidden'>
        {space?.isOpen && (
          <>
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
          </>
        )}
      </div>
      <div className='flex p-2 items-center text-xs'>
        <div>{objects.length} objects</div>
        <div className='grow' />
        <StatusBar flushing={flushing} />
      </div>
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
