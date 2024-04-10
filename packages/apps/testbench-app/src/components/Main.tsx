//
// Copyright 2024 DXOS.org
//

import { randSentence } from '@ngneat/falso'; // TODO(burdon): Reconcile with echo-generator.
import React, { useEffect, useState } from 'react';

import * as E from '@dxos/echo-schema'; // TODO(burdon): [API]: Import syntax?
import { type PublicKey, useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';

import { AppToolbar } from './AppToolbar';
import { DataToolbar } from './DataToolbar';
import { ErrorIndicator } from './ErrorIndicator';
import { ItemList } from './ItemList';
import { SpaceToolbar } from './SpaceToolbar';
import { ItemType, TextV0Type } from '../data';
import { defs } from '../defs';
import { log } from '@dxos/log';

export const Main = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();

  const [debug, setDebug] = useState(false);
  const [filter, setFilter] = useState<string>();
  const [isFlushing, setIsFlushing] = useState(false);
  const flushingPromise = React.useRef<Promise<void>>();

  // TODO(burdon): [BUG]: Shows deleted objects.
  const objects = useQuery<ItemType>(
    space,
    E.Filter.schema(ItemType, (object: ItemType) => match(filter, object.text?.content)),
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
      // TODO(burdon): [API]: Use basic Automerge strings?
      // space.db.add(E.object(ItemType, { content: '' }));
      space.db.add(E.object(ItemType, { text: E.object(TextV0Type, { content: randSentence() }) }));
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

      {/* TODO(burdon): Different UX panels (e.g., table). */}
      <div className='flex flex-col grow overflow-hidden'>
        {space && (
          <>
            <DataToolbar
              isFlushing={isFlushing}
              onAdd={handleAdd}
              onFilterChange={setFilter}
              onDebugChange={setDebug}
            />
            <ItemList debug={debug} objects={objects} onDelete={handleDelete} />
          </>
        )}
      </div>

      {/* TODO(burdon): Toggle network. */}
      <div className='flex p-2 items-center text-xs'>
        <div>{objects.length} objects</div>
        <div className='grow' />
        <ErrorIndicator />
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
