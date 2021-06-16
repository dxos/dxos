//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React from 'react';
import crypto from 'crypto';
import pump from 'pump';

import { Button, Toolbar } from '@material-ui/core';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';
import {ERR_EXTENSION_RESPONSE_FAILED, ERR_EXTENSION_RESPONSE_TIMEOUT, Extension, Protocol} from '@dxos/protocol'
import { sleep } from '@dxos/async';
import { useEffect } from 'react';

const bufferExtension = 'buffer';
const timeout = 1000;

const waitOneWayMessage: any = {};
waitOneWayMessage.promise = new Promise((resolve) => {
  waitOneWayMessage.resolve = resolve;
});

const topic = crypto.randomBytes(32);
// const onInit = jest.fn();

const createUser1Protocol = (): Protocol => {
  const protocol1 = new Protocol()
  .setSession({ user: 'user1' })
  .setExtension(
    new Extension(bufferExtension, { timeout })
      .setInitHandler(async () => {
        console.log('Protocol1 onInit!')
        // onInit();
      })
  )
  .init(topic);

  protocol1.setHandshakeHandler(async (protocol) => {
    const bufferMessages = protocol.getExtension(bufferExtension)!;
  
    bufferMessages.on('error', (err: any) => {
      // log('Error: %o', err);
    });
  
    const session = protocol.getSession();
  
    console.assert(session.user === 'user2')
  
    {
      const { response: { data } } = await bufferMessages.send(Buffer.from('ping'));
      console.assert(data === Buffer.from('pong'), 'is not pong')
    }
  
    {
      const result = await bufferMessages.send(Buffer.from('oneway'), { oneway: true });
      console.assert(result === undefined, 'result is not undefined')
      const data = await waitOneWayMessage.promise;
      console.assert(data === Buffer.from('oneway'), 'is not oneway')
    }
  
    try {
      await bufferMessages.send(Buffer.from('crash'));
    } catch (err) {
      // eslint-disable-next-line
      // expect(ERR_EXTENSION_RESPONSE_FAILED.equals(err)).toBe(true);
      // eslint-disable-next-line
      // expect(err.responseMessage).toBe('Invalid data.');
    }
  
    try {
      await bufferMessages.send(Buffer.from('timeout'));
    } catch (err) {
      // eslint-disable-next-line
      console.assert(ERR_EXTENSION_RESPONSE_TIMEOUT.equals(err), 'is not timeout')
    }
  
    // log('%o', bufferMessages.stats);
    protocol1.stream.destroy();
  });

  return protocol1;
}

const createUser2Protocol = (): Protocol => {
  return new Protocol()
  .setSession({ user: 'user2' })
  .setHandshakeHandler(async () => {
    // expect(onInit).toHaveBeenCalledTimes(2);
  })
  .setExtension(new Extension(bufferExtension, { timeout })
    .setInitHandler(async () => {
      await sleep(2 * 1000);
      console.log('user2 onInit')
      // onInit();
    })
    .setMessageHandler(async (protocol, message) => {
      const { data } = message;

      switch (data.toString()) {
        // Async response.
        case 'ping': {
          return Buffer.from('pong');
        }

        case 'oneway': {
          waitOneWayMessage.resolve(data);
          return;
        }

        // Timeout.
        case 'timeout': {
          await sleep(timeout * 2);
          break;
        }

        // Error.
        default: {
          throw new Error('Invalid data.');
        }
      }
    }))
  .init(topic);
}

export const createProtocols = () => {
  const protocol1 = createUser1Protocol();
  const protocol2 = createUser2Protocol();

  protocol1.error.on((err: any) => console.log('protocol1', err));
  protocol2.error.on((err: any) => console.log('protocol2', err));

  return {protocol1, protocol2}
}
