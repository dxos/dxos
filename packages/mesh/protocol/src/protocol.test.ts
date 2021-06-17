//
// Copyright 2020 DXOS.org
//

import crypto from 'crypto';
import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';
import pump from 'pump';
import waitForExpect from 'wait-for-expect';

import { ERR_EXTENSION_RESPONSE_FAILED, ERR_EXTENSION_RESPONSE_TIMEOUT } from './errors';
import { Extension } from './extension';
import { Protocol } from './protocol';

const log = debug('test');
debug.enable('test,protocol');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('basic without extensions', async () => {
  const timeout = 1000;

  const waitOneWayMessage: any = {};
  waitOneWayMessage.promise = new Promise((resolve) => {
    waitOneWayMessage.resolve = resolve;
  });

  const topic = crypto.randomBytes(32);
  let onInitCalled = 0;
  const onInit = () => onInitCalled++;

  const protocol1 = new Protocol({ discoveryKey: topic })
    .setSession({ user: 'user1' })
    .setHandshakeHandler(async () => {
      onInit();
    })
    .init();

  const protocol2 = new Protocol({ discoveryKey: topic })
    .setSession({ user: 'user2' })
    .setHandshakeHandler(async () => {
      onInit()
    })
    .init();

  protocol1.error.on(err => console.log('protocol1', err));
  protocol2.error.on(err => console.log('protocol2', err));

  await waitForExpect(async () => {
    expect(onInitCalled).toBe(2);
  })

  // protocol1.setHandshakeHandler(async (protocol) => {
  //   expect(onInitCalled).toBe(2);

  //   const bufferMessages = protocol.getExtension(bufferExtension)!;

  //   bufferMessages.on('error', (err: any) => {
  //     log('Error: %o', err);
  //   });

  //   const session = protocol.getSession();

  //   expect(session.user).toBe('user2');

  //   {
  //     const { response: { data } } = await bufferMessages.send(Buffer.from('ping'));
  //     expect(data).toEqual(Buffer.from('pong'));
  //   }

  //   {
  //     const result = await bufferMessages.send(Buffer.from('oneway'), { oneway: true });
  //     expect(result).toBeUndefined();
  //     const data = await waitOneWayMessage.promise;
  //     expect(data).toEqual(Buffer.from('oneway'));
  //   }

  //   try {
  //     await bufferMessages.send(Buffer.from('crash'));
  //   } catch (err) {
  //     // eslint-disable-next-line
  //     expect(ERR_EXTENSION_RESPONSE_FAILED.equals(err)).toBe(true);
  //     // eslint-disable-next-line
  //     expect(err.responseMessage).toBe('Invalid data.');
  //   }

  //   try {
  //     await bufferMessages.send(Buffer.from('timeout'));
  //   } catch (err) {
  //     // eslint-disable-next-line
  //     expect(ERR_EXTENSION_RESPONSE_TIMEOUT.equals(err)).toBe(true); // timeout.
  //   }

  //   log('%o', bufferMessages.stats);
  //   protocol1.stream.destroy();
  // });

  return new Promise<void>(resolve => pump(protocol1.stream, protocol2.stream, protocol1.stream, () => {
    resolve();
  }));
}).timeout(0 * 1000);

test('basic', async () => {
  expect.assertions(9);

  const bufferExtension = 'buffer';
  const timeout = 1000;

  const waitOneWayMessage: any = {};
  waitOneWayMessage.promise = new Promise((resolve) => {
    waitOneWayMessage.resolve = resolve;
  });

  const topic = crypto.randomBytes(32);
  let onInitCalled = 0;
  const onInit = () => onInitCalled++;

  const protocol1 = new Protocol({ discoveryKey: topic })
    .setSession({ user: 'user1' })
    .setExtension(
      new Extension(bufferExtension, { timeout })
        .setInitHandler(async () => {
          onInit();
        })
    )
    .init();

  const protocol2 = new Protocol({ discoveryKey: topic })
    .setSession({ user: 'user2' })
    .setHandshakeHandler(async () => {
      expect(onInitCalled).toBe(2);
    })
    .setExtension(new Extension(bufferExtension, { timeout })
      .setInitHandler(async () => {
        await sleep(2 * 1000);
        onInit();
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
            throw new Error('Invalid data.');
          }
        }
      }))
    .init();

  protocol1.error.on(err => console.log('protocol1', err));
  protocol2.error.on(err => console.log('protocol2', err));

  expect(protocol1.id).toBeDefined();
  expect(protocol2.id).toBeDefined();

  protocol1.setHandshakeHandler(async (protocol) => {
    expect(onInitCalled).toBe(2);

    const bufferMessages = protocol.getExtension(bufferExtension)!;

    bufferMessages.on('error', (err: any) => {
      log('Error: %o', err);
    });

    const session = protocol.getSession();

    expect(session.user).toBe('user2');

    {
      const { response: { data } } = await bufferMessages.send(Buffer.from('ping'));
      expect(data).toEqual(Buffer.from('pong'));
    }

    {
      const result = await bufferMessages.send(Buffer.from('oneway'), { oneway: true });
      expect(result).toBeUndefined();
      const data = await waitOneWayMessage.promise;
      expect(data).toEqual(Buffer.from('oneway'));
    }

    try {
      await bufferMessages.send(Buffer.from('crash'));
    } catch (err) {
      // eslint-disable-next-line
      expect(ERR_EXTENSION_RESPONSE_FAILED.equals(err)).toBe(true);
      // eslint-disable-next-line
      expect(err.responseMessage).toBe('Invalid data.');
    }

    try {
      await bufferMessages.send(Buffer.from('timeout'));
    } catch (err) {
      // eslint-disable-next-line
      expect(ERR_EXTENSION_RESPONSE_TIMEOUT.equals(err)).toBe(true); // timeout.
    }

    log('%o', bufferMessages.stats);
    protocol1.stream.destroy();
  });

  return new Promise<void>(resolve => pump(protocol1.stream, protocol2.stream, protocol1.stream, () => {
    resolve();
  }));
}).timeout(0 * 1000);

test('protocol init error', async () => {
  expect.assertions(1);

  const bufferExtension = 'buffer';

  const waitOneWayMessage: any = {};
  waitOneWayMessage.promise = new Promise((resolve) => {
    waitOneWayMessage.resolve = resolve;
  });

  const topic = crypto.randomBytes(32);
  let onHandshakeCalled = 0;
  const onHandshake = () => onHandshakeCalled++;

  const protocol = (name: string, error?: any) => new Protocol({ discoveryKey: topic })
    .setContext({ name })
    .setHandshakeHandler(async () => {
      onHandshake();
    })
    .setExtension(
      new Extension(bufferExtension)
        .setInitHandler(async () => {
          if (error) {
            await sleep(5 * 100);
            throw error;
          }
        })
    )
    .init();

  const protocol1 = protocol('protocol1');
  const protocol2 = protocol('protocol2', new Error('big error'));

  return new Promise<void>(resolve => pump(protocol1.stream, protocol2.stream, protocol1.stream, () => {
    expect(onHandshakeCalled).toBe(0);
    resolve();
  }));
});
