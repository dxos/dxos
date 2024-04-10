//
// Copyright 2024 DXOS.org
//

import { randSentence } from '@ngneat/falso'; // TODO(burdon): Reconcile with echo-generator.
import { ArrowsClockwise } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import * as E from '@dxos/echo-schema'; // TODO(burdon): [API]: Import syntax?
import { log } from '@dxos/log';
import { type PublicKey, useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';

import { AppToolbar } from './AppToolbar';
import { DataToolbar, type DataView } from './DataToolbar';
import { ItemList } from './ItemList';
import { ItemTable } from './ItemTable';
import { SpaceToolbar } from './SpaceToolbar';
import { ErrorIndicator, NetworkIndicator } from './status';
import { ItemType } from '../data';
import { defs } from '../defs';

// const dateRange = {
//   from: new Date(),
//   to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
// };

export const Main = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();

  const [view, setView] = useState<DataView>();
  const [filter, setFilter] = useState<string>();
  const [isFlushing, setIsFlushing] = useState(false);
  const flushingPromise = React.useRef<Promise<void>>();

  // TODO(burdon): [BUG]: Shows deleted objects.
  // TODO(burdon): Remove restricted list of objects.
  const objects = useQuery<ItemType>(
    space,
    E.Filter.schema(ItemType, (object: ItemType) => match(filter, object.content)),
    {},
    [filter],
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

  const handleAdd = (n = 1) => {
    if (!space) {
      return;
    }

    Array.from({ length: n }).forEach(() => {
      // TODO(burdon): Migrate generator from DebugPlugin.
      space.db.add(
        E.object(ItemType, {
          content: randSentence(),
          // due: randBetweenDate(dateRange)
        }),
      );
    });

    setIsFlushing(true);
    const promise = space.db.flush();
    flushingPromise.current = promise;
    promise.then(
      () => {
        if (flushingPromise.current === promise) {
          setIsFlushing(false);
        }
      },
      (err) => {
        log.catch(err);
      },
    );
  };

  const handleDelete = (id: string) => {
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
    return space.key;
  };

  const handleSpaceClose = async (spaceKey: PublicKey) => {
    const space = client.spaces.get(spaceKey);
    await space?.close(); // TODO(burdon): [BUG] Not implemented error.
    setSpace(undefined);
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
    <div className='flex flex-col grow max-w-[40rem] shadow-lg bg-white dark:bg-black divide-y'>
      <AppToolbar
        onHome={() => window.open(defs.issueUrl, 'DXOS')}
        onProfile={() => {
          void client.shell.open();
        }}
      />

      <SpaceToolbar
        onCreate={handleSpaceCreate}
        onClose={handleSpaceClose}
        onSelect={handleSpaceSelect}
        onInvite={handleSpaceInvite}
      />

      <div className='flex flex-col grow overflow-hidden'>
        {space && (
          <>
            <DataToolbar onAdd={handleAdd} onFilterChange={setFilter} onViewChange={(view) => setView(view)} />

            {view === 'list' && <ItemList objects={objects} onDelete={handleDelete} />}
            {view === 'debug' && <ItemList debug objects={objects} onDelete={handleDelete} />}
            {view === 'table' && <ItemTable schema={ItemType} objects={objects} />}
          </>
        )}
      </div>

      <div className='flex p-2 items-center text-xs'>
        <div>{objects.length} objects</div>
        <div className='grow' />
        <div className='flex gap-1 items-center'>
          {isFlushing && <ArrowsClockwise className='animate-spin' />}
          {/* TODO(burdon): Toggle network. */}
          <NetworkIndicator />
          <ErrorIndicator />
        </div>
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
