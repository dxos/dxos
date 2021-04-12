//
// Copyright 2019 DXOS.org
//

import debug from 'debug';
import pump from 'pump';

import { keyToString, randomBytes, PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

import { Keyring } from '../keys';
import { createKeyAdmitMessage } from '../party';
import { Command, KeyType } from '../proto';
import { Greeter } from './greeter';
import { GreetingCommandPlugin } from './greeting-command-plugin';

const log = debug('dxos:creds:greet');

/**
 * Create the Greeter with Plugin and Protocol.
 * @param targetPartyKey
 */
const createGreeter = async (targetPartyKey) => {
  let outerResolve;
  const writePromise = new Promise((resolve) => {
    outerResolve = resolve;
  });

  const hints = [
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.IDENTITY },
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.DEVICE },
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.FEED },
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.FEED }
  ];

  const greeter = new Greeter(
    targetPartyKey,
    messages => outerResolve(messages),
    () => hints
  );

  const peerId = randomBytes(32);
  const plugin = new GreetingCommandPlugin(peerId, greeter.createMessageHandler());

  const protocol = new Protocol({
    streamOptions: {
      live: true
    }
  })
    .setSession({ peerId })
    .setExtension(plugin.createExtension())
    .init(peerId);

  return { greeter, rendezvousKey: peerId, plugin, protocol, writePromise, hints };
};

/**
 * Create the Invitee with Plugin and Protocol.
 * @param {Buffer} rendezvousKey
 * @param {Buffer} invitationId
 */
const createInvitee = async (rendezvousKey, invitationId) => {
  const peerId = invitationId;

  const invitee = new Greeter();
  const plugin = new GreetingCommandPlugin(peerId, invitee.createMessageHandler());

  const connectionPromise = new Promise(resolve => {
    plugin.on('peer:joined', (peerId) => {
      if (peerId && keyToString(peerId) === keyToString(rendezvousKey)) {
        log(`${keyToString(peerId)} connected.`);
        resolve();
      }
    });
  });

  const protocol = new Protocol({
    streamOptions: {
      live: true
    }
  })
    .setSession({ peerId })
    .setExtension(plugin.createExtension())
    .init(rendezvousKey);

  // TODO(burdon): Bad return object (too many things).
  return { protocol, invitee, plugin, peerId, connectionPromise };
};

/**
 * Connect two Protocols together.
 * @param {Protocol} source
 * @param {Protocol} target
 */
const connect = (source, target) => {
  return pump(source.stream, target.stream, source.stream);
};

test('Greeting Flow using GreetingCommandPlugin', async () => {
  const targetPartyKey = PublicKey.from(randomBytes(32));
  const secret = '0000';

  const secretProvider = async () => Buffer.from(secret);
  const secretValidator = async (invitation, secret) => secret && secret.equals(invitation.secret);

  const {
    protocol: greeterProtocol, greeter, rendezvousKey, hints, writePromise
  } = await createGreeter(targetPartyKey);

  const invitation = await greeter.createInvitation(targetPartyKey, secretValidator, secretProvider);

  const {
    protocol: inviteeProtocol, plugin, connectionPromise
  } = await createInvitee(rendezvousKey, invitation.id);

  connect(greeterProtocol, inviteeProtocol);

  await connectionPromise;

  // Present the invitation (by showing up).
  {
    const command = {
      __type_url: 'dxos.credentials.greet.Command',
      command: Command.Type.BEGIN
    };

    await plugin.send(rendezvousKey, command);
  }

  // Obtain the nonce and partyKey from the HANDSHAKE response.
  const { nonce, partyKey } = await (async () => {
    const command = {
      __type_url: 'dxos.credentials.greet.Command',
      command: Command.Type.HANDSHAKE,
      secret: await secretProvider(),
      params: []
    };

    const { nonce, partyKey } = await plugin.send(rendezvousKey, command);
    return { nonce, partyKey };
  })();

  // Create a signed credential and submit it to the Greeter for "writing" (see writePromise).
  {
    const keyring = new Keyring();
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });

    const command = {
      __type_url: 'dxos.credentials.greet.Command',
      command: Command.Type.NOTARIZE,
      secret: await secretProvider(),
      params: [
        createKeyAdmitMessage(keyring,
          partyKey,
          identityKey,
          [identityKey],
          nonce)
      ]
    };

    // Send them to the greeter.
    const notarizeResponse = await plugin.send(rendezvousKey, command);
    expect(notarizeResponse.hints).toEqual(hints);

    // In the real world, the response would be signed in an envelope by the Greeter, but in this test it is not altered.
    const written = await writePromise;
    expect(written.length).toBe(1);
    expect(written[0].payload.signatures).toEqual(command.params[0].payload.signatures);
  }

  await plugin.send(rendezvousKey, {
    __type_url: 'dxos.credentials.greet.Command',
    command: Command.Type.FINISH,
    secret: await secretProvider()
  });
});
