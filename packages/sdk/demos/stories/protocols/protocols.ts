//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';

import { sleep } from '@dxos/async';
import { ERR_EXTENSION_RESPONSE_TIMEOUT, Extension, Protocol } from '@dxos/protocol';

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
          console.log('Protocol1 onInit!');
        // onInit();
        })
    )
    .init(topic);

  protocol1.setHandshakeHandler(async (protocol) => {
    const bufferMessages = protocol.getExtension(bufferExtension)!;

    const session = protocol.getSession();

    console.assert(session.user === 'user2');

    {
      const { response: { data } } = await bufferMessages.send(Buffer.from('ping'));
      console.assert(Buffer.from(data).toString() === 'pong', 'is not pong', Buffer.from(data).toString());
    }

    {
      const result = await bufferMessages.send(Buffer.from('oneway'), { oneway: true });
      console.assert(result === undefined, 'result is not undefined');
      const data = await waitOneWayMessage.promise;
      console.assert(Buffer.from(data).toString() === 'oneway', 'is not oneway', Buffer.from(data).toString());
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
};

const createUser2Protocol = (): Protocol => {
  return new Protocol()
    .setSession({ user: 'user2' })
    .setHandshakeHandler(async () => {
    // expect(onInit).toHaveBeenCalledTimes(2);
    })
    .setExtension(new Extension(bufferExtension, { timeout })
      .setInitHandler(async () => {
        await sleep(2 * 1000);
      })
      .setMessageHandler(async (protocol, message) => {
        const { data } = message;

        switch (Buffer.from(data).toString()) {
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
            throw new Error('Invalid data: ' + Buffer.from(data).toString());
          }
        }
      }))
    .init(topic);
};

export const createProtocols = () => {
  const protocol1 = createUser1Protocol();
  const protocol2 = createUser2Protocol();

  protocol1.error.on((err: any) => console.log('protocol1', err));
  protocol2.error.on((err: any) => console.log('protocol2', err));

  return { protocol1, protocol2 };
};
