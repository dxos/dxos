//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { scheduleTask, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Config, useConfig } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Button } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/storybook-utils';

const testVideo = new URL('../testing/video.mp4', import.meta.url).href;

import { CALLS_URL, CallsServicePeer, type TrackObject } from './calls';
import { useBlackCanvasStreamTrack, useInaudibleAudioStreamTrack, useVideoStreamTrack } from './hooks';

// TODO(burdon): THIS IS TOO COMPLEX FOR A TEST SETUP.
const pushAndPullTrack = (mediaStreamTrack?: MediaStreamTrack) => {
  const config = useConfig();
  const callsConfig = {
    iceServers: config.get('runtime.services.ice'),
    apiBase: `${CALLS_URL}/api/calls`,
  };
  const peerPush = useMemo(() => new CallsServicePeer(callsConfig), []);
  const peerPull = useMemo(() => new CallsServicePeer(callsConfig), []);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const trackInfo = useRef<TrackObject | undefined>(undefined);
  const pullCtx = useRef<Context | undefined>(undefined);
  const [pulledTrack, setPulledTrack] = useState<MediaStreamTrack | undefined>(undefined);
  const hadRun = useRef(false);

  const deps: any[] = [];
  // Push/pull video stream track to cloudflare.
  useEffect(() => {
    if (hadRun.current || !mediaStreamTrack || !peerPush || !peerPull) {
      return;
    }
    hadRun.current = true;
    const ctx = Context.default();
    log.info('setting up ctx', { ctx, mediaStreamTrack, peerPush, peerPull });
    deps.push([ctx, mediaStreamTrack, peerPush, peerPull]);
    ctx.onDispose(() => {
      log.info('disposing ctx', {});
    });
    scheduleTask(
      ctx,
      async () => {
        log.info('starting push/pull', { mediaStreamTrack });
        await peerPush.open();
        await peerPull.open();
        ctx.onDispose(() => {
          void peerPush.close();
          void peerPull.close();
        });

        // Push track to cloudflare.
        performance.mark('push:begin');
        log.info('pushing track', { track: mediaStreamTrack });
        trackInfo.current = await peerPush.pushTrack({ track: mediaStreamTrack, ctx: Context.default() });
        performance.mark('push:end');
        const pushTime = performance.measure('push', 'push:begin', 'push:end').duration;
        log.info('successfully pushed track', { pushTime, trackInfo: trackInfo.current });
        setMetrics((prev) => ({ ...prev, 'time to push track [ms]': Math.round(pushTime) }));

        // Pull track from cloudflare.
        performance.mark('pullTrack:begin');
        pullCtx.current = Context.default();
        let retries = 0;
        let pulledTrack: MediaStreamTrack | undefined;
        while (!pulledTrack && retries < 3) {
          retries++;
          log.info('pulling track', {
            trackData: { ...trackInfo.current!, mid: undefined },
            retries,
            pulledTrack,
          });
          pulledTrack = await peerPull.pullTrack({
            trackData: { ...trackInfo.current!, mid: undefined },
            ctx: pullCtx.current,
          });
          await sleep(200);
        }
        invariant(pulledTrack);
        setPulledTrack(pulledTrack);
        performance.mark('pullTrack:end');
        const pullTime = performance.measure('pullTrack', 'pullTrack:begin', 'pullTrack:end').duration;
        setMetrics((prev) => ({ ...prev, 'time to pull track [ms]': Math.round(pullTime) }));
        log.info('successfully pulled track', { pullTime, pulledTrack });
      },
      1000,
    );

    return () => {
      void ctx.dispose();
    };
  }, [mediaStreamTrack, peerPush, peerPull]);

  const rePullTrack = useCallback(async () => {
    performance.mark('rePullVideo:begin');
    if (!pulledTrack) {
      log.info('no pulled track, skipping re-pull', { pulledTrack });
      return;
    }
    pulledTrack.stop();
    await pullCtx.current!.dispose();
    pullCtx.current = Context.default();
    const newPulledTrack = await peerPull.pullTrack({
      trackData: { ...trackInfo.current!, mid: undefined },
      ctx: pullCtx.current,
    });
    invariant(newPulledTrack);
    setPulledTrack(newPulledTrack);
    performance.mark('rePullVideo:end');
    const rePullTime = performance.measure('rePullVideo', 'rePullVideo:begin', 'rePullVideo:end').duration;
    setMetrics((prev) => ({ ...prev, 'time to re-pull video [ms]': Math.round(rePullTime) }));
  }, [peerPull, trackInfo.current, pullCtx.current, pulledTrack]);

  return {
    pulledTrack,
    rePullTrack,
    metrics,
    pushService: peerPush,
    pullService: peerPull,
  };
};

type StoryProps = { source: string };

const DefaultStory = ({ source }: StoryProps) => {
  const pushVideoElement = useRef<HTMLVideoElement>(null);
  const pullVideoElement = useRef<HTMLVideoElement>(null);
  // Get video stream track.
  const videoStreamTrack = useVideoStreamTrack(pushVideoElement, source);
  const { pulledTrack, rePullTrack, metrics } = pushAndPullTrack(videoStreamTrack);
  const hadRun = useRef(false);

  // Push/pull video stream track to cloudflare.
  useEffect(() => {
    if (!pulledTrack || hadRun.current) {
      return;
    }
    hadRun.current = true;
    const ctx = Context.default();
    scheduleTask(ctx, async () => {
      pullVideoElement.current!.srcObject = new MediaStream([pulledTrack]);
      await pullVideoElement.current!.play();
    });

    return () => {
      void ctx.dispose();
    };
  }, [pulledTrack]);

  return (
    <div className='grid grid-rows-3 gap-4 items-center'>
      <video ref={pushVideoElement} muted autoPlay loop />
      <div className='flex flex-col gap-4'>
        <video ref={pullVideoElement} muted />
        <Button disabled={!pulledTrack} onClick={rePullTrack}>
          Re-pull video
        </Button>
      </div>
      <Json data={metrics} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-thread/calls-service',
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      config: new Config({
        runtime: {
          services: {
            iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
          },
        },
      }),
    }),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    source: testVideo,
  },
};

export const InaudibleAudioStreamTrack = {
  render: () => {
    const audioStreamTrack = useInaudibleAudioStreamTrack();
    const { rePullTrack, metrics } = pushAndPullTrack(audioStreamTrack);

    return (
      <div className='flex flex-col gap-4 items-center'>
        <Json data={metrics} />
        <Button onClick={rePullTrack}>Re-pull audio</Button>
      </div>
    );
  },
};

export const BlackVideoStreamTrack = {
  render: () => {
    const videoStreamTrack = useBlackCanvasStreamTrack();
    const { rePullTrack, metrics } = pushAndPullTrack(videoStreamTrack);
    return (
      <div className='flex flex-col gap-4 items-center'>
        <Json data={metrics} />
        <Button onClick={rePullTrack}>Re-pull audio</Button>
      </div>
    );
  },
};
