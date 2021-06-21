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

test('protocol sessions', async () => {
  // TODO: test setsession / getsession
}).timeout(1 * 1000);

test('basic without extensions', async () => {
  const topic = crypto.randomBytes(32);
  let onInitCalled = 0;
  const onInit = () => onInitCalled++;

  const protocol1 = new Protocol({
    discoveryKey: topic,
    initiator: true,
    streamOptions: {
      onhandshake: async () => {
        onInit();
      }
    }
  })
    .setSession({ user: 'user1' })
    .init();

  const protocol2 = new Protocol({
    discoveryKey: topic,
    initiator: false,
    streamOptions: {
      onhandshake: async () => {
        onInit();
      }
    }
  })
    .setSession({ user: 'user2' })
    .init();

  protocol1.error.on(err => console.log('protocol1', err));
  protocol2.error.on(err => console.log('protocol2', err));

  pump(protocol1.stream as any, protocol2.stream as any, protocol1.stream as any);

  await waitForExpect(async () => {
    expect(onInitCalled).toBe(2);
  });
}).timeout(1 * 1000);

test('basic with a buffer ping-pong extension', async () => {
  const topic = crypto.randomBytes(32);
  const bufferExtension = 'buffer';
  const timeout = 1000;

  const protocol1 = new Protocol({
    discoveryKey: topic,
    initiator: true,
    streamOptions: {
      onhandshake: async () => {}
    }
  })
    .setExtension(
      new Extension(bufferExtension, { timeout })
        .setInitHandler(async () => {})
    )
    .setSession({ user: 'user1' })
    .init();

  const protocol2 = new Protocol({
    discoveryKey: topic,
    initiator: false,
    streamOptions: {
      onhandshake: async () => {}
    }
  })
    .setSession({ user: 'user2' })
    .setExtension(new Extension(bufferExtension, { timeout })
      .setInitHandler(async () => {})
      .setMessageHandler(async (protocol, message) => {
        const { data } = message;

        switch (Buffer.from(data).toString()) {
          case 'ping': {
            return Buffer.from('pong');
          }
          default: {
            throw new Error('Invalid data.');
          }
        }
      }))
    .init();

  protocol1.error.on(err => console.log('protocol1', err));
  protocol2.error.on(err => console.log('protocol2', err));

  protocol1.setHandshakeHandler(async (protocol) => {
    const bufferMessages = protocol.getExtension(bufferExtension)!;
    expect(bufferMessages).toBeDefined();

    {
      const { response: { data } } = await bufferMessages.send(Buffer.from('ping'));
      expect(data).toEqual(Buffer.from('pong'));
      protocol1.close();
    }
  });
  return new Promise<void>(resolve => pump(protocol1.stream as any, protocol2.stream as any, protocol1.stream as any, () => {
    resolve();
  }));
}).timeout(1 * 1000);

test('basic ping and oneway', async () => {
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

  const protocol1 = new Protocol({ discoveryKey: topic, initiator: true })
    .setSession({ user: 'user1' })
    .setExtension(
      new Extension(bufferExtension, { timeout })
        .setInitHandler(async () => {
          onInit();
        })
    )
    .setHandshakeHandler(async (protocol) => {
      expect(onInitCalled).toBe(2);

      const bufferMessages = protocol.getExtension(bufferExtension)!;

      bufferMessages.on('error', (err: any) => {
        log('Error: %o', err);
      });

      // const session = protocol.getSession();
      // expect(session.user).toBe('user2');

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
      protocol1.close();
    })
    .init();

  const protocol2 = new Protocol({ discoveryKey: topic, initiator: false })
    .setSession({ user: 'user2' })
    .setHandshakeHandler(async () => {
      expect(onInitCalled).toBe(2);
    })
    .setExtension(new Extension(bufferExtension, { timeout })
      .setInitHandler(async () => {
        await sleep(200);
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

  return new Promise<void>(resolve => pump(protocol1.stream as any, protocol2.stream as any, protocol1.stream as any, () => {
    resolve();
  }));
});

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

  const protocol = (name: string, error?: any, initiator?: boolean) => new Protocol({ discoveryKey: topic, initiator })
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
  const protocol2 = protocol('protocol2', new Error('big error'), true);

  return new Promise<void>(resolve => pump(protocol1.stream as any, protocol2.stream as any, protocol1.stream as any, () => {
    expect(onHandshakeCalled).toBe(0);
    resolve();
  }));
});
