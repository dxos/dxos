//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { sleep, Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { clientServiceBundle, ClientServicesProvider } from '@dxos/client-services';
import { PublicKey } from '@dxos/keys';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { useSpace } from '@dxos/react-client';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

// const DOCKER_URL = 'https://cors-anywhere.herokuapp.com/' + 'http://198.211.114.136:4243';

// socat -d TCP-LISTEN:2376,range=127.0.0.1/32,reuseaddr,fork UNIX:/var/run/docker.sock
// cors-proxy-server

const DOCKER_URL = 'http://127.0.0.1:2376';

export const BotsFrame = () => {
  const [resp, setResp] = useState({});
  const [status, setStatus] = useState('');
  const space = useSpace();

  const refresh = () => {
    // https://docs.docker.com/engine/api/v1.42/
    void fetch(`${DOCKER_URL}/containers/json?all=true`)
      .then((r) => r.json())
      .then((r) => setResp(r));
  };

  useEffect(() => {
    refresh();
  }, []);

  const addBot = async () => {
    setStatus('Creating container...');
    const name = 'bot-' + PublicKey.random().toHex().slice(0, 8);
    const port = Math.floor(Math.random() * 1000) + 3000;
    const res = await fetch(`${DOCKER_URL}/containers/create?name=${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Image: 'bot-test',
        ExposedPorts: {
          '3023/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '3023/tcp': [
              {
                HostPort: `${port}`
              }
            ]
          }
        },
        Env: ['LOG_FILTER=debug'],
        Labels: {
          'dxos.bot': `${true}`,
          'dxos.bot.dxrpc-port': `${port}`
        }
      })
    });
    const data = await res.json();
    console.log(data);
    refresh();
    setStatus('Starting container...');
    await fetch(`${DOCKER_URL}/containers/${data.Id}/start`, {
      method: 'POST'
    });
    refresh();
    setStatus('Waiting for bot to start...');
    const botEndpoint = `ws://127.0.0.1:${port}`;

    while (true) {
      try {
        await fetch(`http://127.0.0.1:${port}`);
        break;
      } catch (err) {
        console.log(err);
      }
      await sleep(500);
    }
    setStatus('Connecting to bot...');

    const botClient = new Client({
      services: fromRemote(botEndpoint)
    });

    await botClient.initialize();

    console.log('status', await botClient.getStatus());
    setStatus('Initializing bot...');

    await botClient.halo.createIdentity({
      displayName: name
    });

    setStatus('Adding bot to space...');

    {
      const trg = new Trigger();
      const invitation = space!.createInvitation({
        authMethod: AuthMethod.NONE
      });
      invitation.subscribe({
        onConnecting: async (invitation1) => {
          console.log('invitation1', invitation1);
          const observable2 = botClient.echo.acceptInvitation(invitation1);
          observable2.subscribe({
            onSuccess: async (invitation2) => {
              trg.wake();
            },
            onCancelled: () => console.error(new Error('cancelled')),
            onTimeout: (err: Error) => console.error(new Error(err.message)),
            onError: (err: Error) => console.error(new Error(err.message))
          });
        },
        onConnected: async (invitation1) => {
          console.log('connected');
        },
        onSuccess: async (invitation1) => {
          console.log('success');
        },
        onCancelled: () => console.error(new Error('cancelled')),
        onTimeout: (err: Error) => console.error(new Error(err.message)),
        onError: (err: Error) => console.error(new Error(err.message))
      });
      await trg.wait();
    }

    setStatus('Done');

    refresh();
  };

  return (
    <div>
      <div className='flex'>
        <button
          onClick={refresh}
          className='inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out'
        >
          Refresh
        </button>
        <button
          onClick={addBot}
          className='inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out'
        >
          Add bot
        </button>
        <div>{status}</div>
      </div>
      <SyntaxHighlighter className='w-full' language='json' style={style}>
        {JSON.stringify(resp, undefined, 2)}
      </SyntaxHighlighter>
    </div>
  );
};

// TODO(dmaretskyi): Extract.
export const fromRemote = (url: string): ClientServicesProvider => {
  const dxrpcClient = new WebsocketRpcClient({
    url,
    requested: clientServiceBundle,
    exposed: {},
    handlers: {}
  });

  return {
    get descriptors() {
      return clientServiceBundle;
    },

    get services() {
      return dxrpcClient.rpc;
    },

    open: () => dxrpcClient.open(),

    close: () => dxrpcClient.close()
  };
};

export default BotsFrame;
