//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Config, useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { useVideoStreamTrack } from '#hooks';

import { createEdgeRoomJoiner } from './edge-room-joiner';
import { RealtimeKitTransport, createRealtimeKitMeetingFactory } from './realtime-kit-transport';

//
// LIVE loopback: simulates two RealtimeKit peers on one page — peer 1 (push) publishes a real video track
// (captured from an <video> playing an mp4) into a meeting; peer 2 (pull) joins the SAME meeting and pulls
// that track back, rendering it. It exercises the real `RealtimeKitTransport` (join → SFU → publish /
// subscribe) through the edge, so it proves push/pull media end-to-end — you should SEE the mp4 mirrored
// into the right (remote) panel.
//
// Not a CI test: nothing runs until mounted, needs a live meeting + a created HALO identity for the edge's
// verifiable-presentation auth, and (for the mp4 to decode) a browser with H.264 support. Read the console
// (filter `LOOPBACK`) or the on-page JSON to follow each step.
//
const LOCAL = true;
const EDGE_URL = LOCAL ? 'http://localhost:8787/' : 'https://edge.dxos.workers.dev/';

const testVideo = new URL('../testing/video.mp4', import.meta.url).href;

const now = () => Math.round(performance.now());

const Loopback = () => {
  const client = useClient();
  const pushVideoRef = useRef<HTMLVideoElement>(null);
  const pullVideoRef = useRef<HTMLVideoElement>(null);
  // Capture a real media track from the mp4 playing in the push (source) element.
  const sourceTrack = useVideoStreamTrack(pushVideoRef, testVideo);
  const started = useRef(false);
  const [state, setState] = useState<Record<string, unknown>>({ status: 'loading-source' });

  const patch = (next: Record<string, unknown>) => {
    log.info('LOOPBACK step', next);
    setState((prev) => ({ ...prev, ...next }));
  };

  useEffect(() => {
    // Wait for the mp4 track before running the loopback; `started` guards StrictMode double-mount.
    if (started.current || !sourceTrack) {
      return;
    }
    started.current = true;

    const roomId = `echo:/rtk-loopback-${PublicKey.random().toHex().slice(0, 16)}`;
    const pushDeviceKey = `push-${PublicKey.random().toHex().slice(0, 16)}`;
    const pullDeviceKey = `pull-${PublicKey.random().toHex().slice(0, 16)}`;
    const joiner = createEdgeRoomJoiner(client);

    void (async () => {
      try {
        patch({
          status: 'source-ready',
          did: client.halo.identity.get()?.did,
          roomId,
          sourceTrackState: sourceTrack.readyState,
          sourceTrackId: sourceTrack.id,
        });

        // Peer 1 (push): create the meeting and publish the mp4 track.
        const push = new RealtimeKitTransport({
          roomId,
          deviceKey: pushDeviceKey,
          joiner,
          createMeeting: createRealtimeKitMeetingFactory(),
        });
        const t0 = now();
        await push.open();
        patch({ status: 'push-joined', pushMeetingId: push.meetingId, pushJoinMs: now() - t0 });

        const descriptor = await push.pushTrack({ ctx: Context.default(), track: sourceTrack });
        patch({ status: 'pushed', pushDescriptor: descriptor });

        // Peer 2 (pull): join the SAME meeting and pull peer 1's track back.
        const pull = new RealtimeKitTransport({
          roomId,
          deviceKey: pullDeviceKey,
          meetingId: push.meetingId,
          joiner,
          createMeeting: createRealtimeKitMeetingFactory(),
        });
        const t1 = now();
        await pull.open();
        patch({
          status: 'pull-joined',
          pullMeetingId: pull.meetingId,
          pullJoinMs: now() - t1,
          sameMeeting: pull.meetingId === push.meetingId,
        });

        // Poll the roster until peer 1's track is published (diagnostic harness; production pulls on events).
        let pulled: MediaStreamTrack | undefined;
        const t2 = now();
        for (let attempt = 1; attempt <= 30 && !pulled; attempt++) {
          pulled = pull
            .getRemoteTracks()
            .find(
              (remote) => remote.trackData.sessionId === pushDeviceKey && remote.trackData.trackName === 'video',
            )?.track;
          patch({ status: 'pulling', pullAttempt: attempt, pulledResolved: !!pulled });
          if (!pulled) {
            await new Promise((resolve) => setTimeout(resolve, 1_000));
          }
        }
        if (!pulled) {
          patch({ status: 'FAILED', reason: 'remote track never resolved' });
          return;
        }
        patch({ status: 'pulled', pullMs: now() - t2, pulledTrackState: pulled.readyState });

        if (pullVideoRef.current) {
          pullVideoRef.current.srcObject = new MediaStream([pulled]);
          await pullVideoRef.current.play().catch((err) => log.warn('LOOPBACK pull play', { err }));
        }

        // Prove media bytes actually decode: videoWidth becomes non-zero once a remote frame arrives.
        for (let attempt = 1; attempt <= 20; attempt++) {
          const width = pullVideoRef.current?.videoWidth ?? 0;
          if (width > 0) {
            patch({ status: 'RECEIVING', videoWidth: width, videoHeight: pullVideoRef.current?.videoHeight });
            break;
          }
          patch({ status: 'awaiting-frames', frameAttempt: attempt, videoWidth: width });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        log.catch(err);
        patch({ status: 'ERROR', error: String(err) });
      }
    })();

    // NOTE: Intentionally no teardown on cleanup. Storybook/StrictMode double-mounts; tearing down here
    // would abort the in-flight loopback (the `started` ref already prevents a second run). This is a
    // throwaway diagnostic story — transports live for the page lifetime.
  }, [client, sourceTrack]);

  return (
    <div className='flex flex-col gap-2 p-2'>
      <div className='grid grid-cols-2 gap-2'>
        <div>
          <div className='text-sm'>Peer 1 — push (mp4 source)</div>
          <video ref={pushVideoRef} muted autoPlay loop playsInline className='is-full bg-black' />
        </div>
        <div>
          <div className='text-sm'>Peer 2 — pull (remote)</div>
          <video ref={pullVideoRef} muted autoPlay playsInline className='is-full bg-black' />
        </div>
      </div>
      <pre className='text-xs whitespace-pre-wrap'>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-calls/experimental/RealtimeKitLoopback',
  render: () => <Loopback />,
  decorators: [
    withTheme(),
    withClientProvider({
      createIdentity: true,
      config: new Config({ runtime: { services: { edge: { url: EDGE_URL } } } }),
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
