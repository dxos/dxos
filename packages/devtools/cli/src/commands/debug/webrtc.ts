//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { getRtcConnectionFactory } from '@dxos/network-manager';

const MESSAGE = 'ping';

/**
 * Opens a data channel between two in-process peers through the same connection factory the client's RTC
 * transport uses, so a binary that cannot load the WebRTC native addon fails here rather than mid device join.
 */
const openLoopbackChannel = async (): Promise<string> => {
  const factory = getRtcConnectionFactory();
  const offerer = await factory.createConnection({ iceServers: [] });
  const answerer = await factory.createConnection({ iceServers: [] });
  try {
    offerer.onicecandidate = ({ candidate }) => candidate && void answerer.addIceCandidate(candidate);
    answerer.onicecandidate = ({ candidate }) => candidate && void offerer.addIceCandidate(candidate);

    const received = new Promise<string>((resolve) => {
      answerer.ondatachannel = ({ channel }) => {
        channel.onmessage = ({ data }) => resolve(String(data));
      };
    });

    const channel = offerer.createDataChannel('dx-debug-webrtc');
    channel.onopen = () => channel.send(MESSAGE);

    await offerer.setLocalDescription(await offerer.createOffer());
    await answerer.setRemoteDescription(offerer.localDescription!);
    await answerer.setLocalDescription(await answerer.createAnswer());
    await offerer.setRemoteDescription(answerer.localDescription!);

    return await received;
  } finally {
    offerer.close();
    answerer.close();
    await factory.onConnectionDestroyed();
    await factory.onConnectionDestroyed();
  }
};

export const webrtc = Command.make(
  'webrtc',
  {},
  Effect.fnUntraced(function* () {
    const received = yield* Effect.tryPromise(openLoopbackChannel).pipe(Effect.timeout(Duration.seconds(10)));
    if (received !== MESSAGE) {
      return yield* Effect.fail(new Error(`Data channel delivered "${received}" instead of "${MESSAGE}".`));
    }
    yield* Console.log('WebRTC data channel opened between two local peers.');
  }),
).pipe(Command.withDescription('Open a WebRTC data channel between two local peers.'));
