//
// Copyright 2025 DXOS.org
//

/* eslint-disable no-console */

import * as BrowserKeyValueStore from '@effect/platform-browser/BrowserKeyValueStore';
import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { Context } from '@dxos/context';
import { Filter, Obj, Type } from '@dxos/echo';
import { useClient, useConfig } from '@dxos/react-client';
import { type SpaceId, type SpaceSyncState } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, ButtonGroup } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

const runtime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage);

const showConfigAtom = Atom.kvs({
  runtime: runtime,
  key: 'dxos.org/testbench-app/show-config',
  schema: Schema.Boolean,
  defaultValue: () => false,
}).pipe(Atom.keepAlive);

const spaceIdAtom = Atom.kvs({
  runtime: runtime,
  key: 'dxos.org/testbench-app/space-id',
  schema: Schema.String,
  defaultValue: () => '',
}).pipe(Atom.keepAlive);

export const SyncBench = () => {
  const config = useConfig();
  const client = useClient();
  const identity = useIdentity();

  const spaceId = useAtomValue(spaceIdAtom) as SpaceId | undefined;
  const setSpaceId = useAtomSet(spaceIdAtom);
  const space = spaceId ? client.spaces.get(spaceId) : client.spaces.default;

  const [syncState, setSyncState] = useState<SpaceSyncState>();
  useEffect(() => {
    const ctx = new Context();
    space?.db.subscribeToSyncState(ctx, (state) => {
      setSyncState(structuredClone(state));
    });
    scheduleTaskInterval(
      ctx,
      async () => {
        setSyncState(structuredClone(await space?.db.getSyncState()));
      },
      1000,
    );

    return () => {
      void ctx.dispose();
    };
  }, [space]);
  const refreshSyncState = async () => {
    setSyncState(structuredClone(await space?.db.getSyncState()));
  };

  const handleInvite = async () => {
    if (!space) {
      return;
    }
    const invitation = space.share({
      multiUse: true,
      authMethod: Invitation.AuthMethod.NONE,
    });
    const code = InvitationEncoder.encode(invitation.get());
    const url = new URL(`?spaceInvitation=${code}`, location.href);
    await navigator.clipboard.writeText(url.href);
  };

  useEffect(() => {
    const code = new URLSearchParams(location.search).get('spaceInvitation');
    console.log('code', code);
    if (code) {
      queueMicrotask(async () => {
        const invitation = client.spaces.join(InvitationEncoder.decode(code));
        invitation.subscribe((state) => console.log(state));
        await invitation.wait();
        // TODO(dmaretskyi): Invitation missing spaceId.
        const space = client.spaces.get().at(-1)!;
        setSpaceId(space.id);
      });
    }
  }, []);

  const createObjects = async (count: number) => {
    if (!space) {
      return;
    }
    for (let i = 0; i < count; i++) {
      space.db.add(
        Obj.make(Type.Expando, {
          data: crypto.randomUUID(),
        }),
      );
    }
    await space.db.flush({ indexes: true });
  };

  const showConfig = useAtomValue(showConfigAtom);
  const setShowConfig = useAtomSet(showConfigAtom);

  const handleLoadAll = async () => {
    if (!space) {
      return;
    }
    const start = performance.now();
    const results = await space.db.query(Filter.everything()).run();
    console.log('loadAll', { time: performance.now() - start, count: results.length });
  };

  return (
    <div className='grid grid-rows-[auto_1fr] gap-2 '>
      <div className='flex flex-col gap-2'>
        <ButtonGroup>
          <Button onClick={() => setShowConfig(!showConfig)}>Show config ({showConfig ? 'on' : 'off'})</Button>
          <Button onClick={refreshSyncState}>Refresh sync state</Button>
          <Button onClick={handleInvite}>Invite</Button>
          <Button onClick={handleLoadAll}>Load all objects</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button onClick={() => createObjects(10)}>Create 10</Button>
          <Button onClick={() => createObjects(100)}>Create 100</Button>
          <Button onClick={() => createObjects(1000)}>Create 1000</Button>
        </ButtonGroup>
      </div>
      <SyntaxHighlighter language='json'>
        {JSON.stringify(
          {
            config: showConfig ? config.values : 'hidden',
            identity: {
              did: identity?.did,
            },
            space: {
              id: space?.id,
            },
            syncState,
          },
          null,
          2,
        )}
      </SyntaxHighlighter>
    </div>
  );
};
