//
// Copyright 2022 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Option from 'effect/Option';
import React, { useMemo } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';

import { Config, defs } from '@dxos/config';
import { Annotation, Obj, Ref } from '@dxos/echo';
import { AtomEx } from '@dxos/effect';
import { type Client, ClientProvider, createClientServices } from '@dxos/react-client';

import { getConfig } from '../config.ts';
import { Todo, TodoList, TodoListAnnotation, createTodoList } from '../types.ts';
import { Main } from './Main.tsx';

/**
 * Experimental ECHO backends, chosen with `?echo=`: `mirror` keeps a JSON mirror of each document in
 * the tab while only the worker runs Automerge, and `indexed` also shows objects from the worker's
 * index until the tab writes to them. Both answer queries in SQL. Anything else is today's replica.
 */
const echoMode = new URLSearchParams(location.search).get('echo');
const echoMirror =
  echoMode === 'mirror' || echoMode === 'indexed' ? { indexedReads: echoMode === 'indexed' } : undefined;

// Dedicated-worker client services. A coordinator SharedWorker elects a single leader tab that owns
// the dedicated Worker hosting the ECHO services; follower tabs proxy through it.
const createServices = (config?: Config) =>
  createClientServices(
    new Config(
      {
        runtime: {
          client: {
            servicesMode: defs.Runtime_Client_ServicesMode.DEDICATED_WORKER,
            ...(echoMirror ? { queryExecutor: defs.Runtime_Client_QueryExecutor.SQL } : {}),
          },
        },
      },
      ...(config ? [config.values] : []),
    ),
    {
      createDedicatedWorker: () =>
        new Worker(new URL('@dxos/client/dedicated-worker', import.meta.url), {
          type: 'module',
          name: 'dxos-client-worker',
        }),
      createCoordinatorWorker: () =>
        new SharedWorker(new URL('@dxos/client/coordinator-worker', import.meta.url), {
          type: 'module',
          name: 'dxos-coordinator-worker',
        }),
    },
  );

/** Adds todos until the list holds `count`, to measure a list of that size (`?seed=count`). */
const seedTodos = async (client: Client, count: number) => {
  for (const space of client.spaces.get()) {
    await space.waitUntilReady();
    const list = await Annotation.get(space.properties, TodoListAnnotation).pipe(Option.getOrUndefined)?.load();
    if (!list) {
      continue;
    }
    const start = list.todos.length;
    const todos = Array.from({ length: Math.max(0, count - start) }, (_, index) =>
      space.db.add(Obj.make(Todo, { title: `todo ${start + index}`, completed: false })),
    );
    Obj.update(list, (list) => {
      list.todos.push(...todos.map((todo) => Ref.make(todo)));
    });
    await space.db.flush();
    return;
  }
};

export const Root = () => {
  const navigate = useNavigate();
  const registry = useMemo(() => AtomEx.makeRegistry(), []);

  return (
    <ClientProvider
      config={getConfig}
      services={createServices}
      shell='./shell.html'
      types={[TodoList, Todo]}
      echoMirror={echoMirror}
      onInitialized={async (client) => {
        const searchProps = new URLSearchParams(location.search);
        const deviceInvitationCode = searchProps.get('deviceInvitationCode');
        if (!client.halo.identity.get() && !deviceInvitationCode) {
          await client.halo.createIdentity();
          const space = await client.spaces.create();
          await space.waitUntilReady();
          createTodoList(space);
        }

        const seed = Number(searchProps.get('seed') ?? 0);
        if (seed > 0) {
          await seedTodos(client, seed);
        }

        const spaceInvitationCode = searchProps.get('spaceInvitationCode');
        if (spaceInvitationCode) {
          void client.shell.joinSpace({ invitationCode: spaceInvitationCode }).then(({ space }) => {
            space && navigate(generatePath('/:spaceKey', { spaceKey: space.key.toHex() }));
          });
        } else if (deviceInvitationCode) {
          void client.shell.joinIdentity({ invitationCode: deviceInvitationCode });
        }
      }}
    >
      <RegistryContext.Provider value={registry}>
        <Main />
      </RegistryContext.Provider>
    </ClientProvider>
  );
};
