//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { scheduleTask, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Config, useConfig } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Button } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type TrackObject, CallsServicePeer, CALLS_URL } from './calls';
import { useInaudibleAudioStreamTrack, useVideoStreamTrack } from './hooks';
// @ts-ignore
import video from '../testing/video.mp4';

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
  const pulledTrack = useRef<MediaStreamTrack | undefined>(undefined);
  const hadRun = useRef(false);

  // Push/pull video stream track to cloudflare.
  useEffect(() => {
    if (hadRun.current || !mediaStreamTrack || !peerPush || !peerPull) {
      log.info('not running', { hadRun: hadRun.current, mediaStreamTrack, peerPush, peerPull });
      return;
    }
    hadRun.current = true;
    const ctx = Context.default();
    ctx.onDispose(() => {
      log.info('disposing ctx', { ctx });
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
        trackInfo.current = await peerPush.pushTrack({ track: mediaStreamTrack });
        performance.mark('push:end');
        const pushTime = performance.measure('push', 'push:begin', 'push:end').duration;
        log.info('successfully pushed track', { pushTime, trackInfo: trackInfo.current });
        setMetrics((prev) => ({ ...prev, 'time to push track [ms]': Math.round(pushTime) }));

        // Wait for cloudflare to process the track.
        await sleep(1000);

        // Pull track from cloudflare.
        performance.mark('pullTrack:begin');
        pullCtx.current = Context.default();
        let retries = 0;
        while (!pulledTrack.current && retries < 3) {
          retries++;
          log.info('pulling track', {
            trackData: { ...trackInfo.current!, mid: undefined },
            retries,
            pulledTrack: pulledTrack.current,
          });
          pulledTrack.current = await peerPull.pullTrack({
            trackData: { ...trackInfo.current!, mid: undefined },
            ctx: pullCtx.current,
          });
          await sleep(200);
        }
        invariant(pulledTrack.current);
        performance.mark('pullTrack:end');
        const pullTime = performance.measure('pullTrack', 'pullTrack:begin', 'pullTrack:end').duration;
        setMetrics((prev) => ({ ...prev, 'time to pull track [ms]': Math.round(pullTime) }));
        log.info('successfully pulled track', { pullTime, pulledTrack });

        invariant(pulledTrack);
      },
      1000,
    );

    return () => {
      void ctx.dispose();
    };
  }, [mediaStreamTrack, peerPush, peerPull]);

  const rePullTrack = useCallback(async () => {
    performance.mark('rePullVideo:begin');
    invariant(pulledTrack.current);
    pulledTrack.current.stop();
    await pullCtx.current!.dispose();
    pullCtx.current = Context.default();
    const newPulledTrack = await peerPull.pullTrack({
      trackData: { ...trackInfo.current!, mid: undefined },
      ctx: pullCtx.current,
    });
    invariant(newPulledTrack);
    pulledTrack.current = newPulledTrack;
    performance.mark('rePullVideo:end');
    const rePullTime = performance.measure('rePullVideo', 'rePullVideo:begin', 'rePullVideo:end').duration;
    setMetrics((prev) => ({ ...prev, 'time to re-pull video [ms]': Math.round(rePullTime) }));
  }, [peerPull, trackInfo.current, pullCtx.current, pulledTrack.current]);

  return {
    pulledTrack,
    rePullTrack,
    metrics,
  };
};

const meta = {
  title: 'plugins/plugin-thread/calls-service',
  decorators: [
    withClientProvider({
      config: new Config({
        runtime: {
          services: {
            iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
          },
        },
      }),
    }),
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default = {
  render: ({ videoSrc }: { videoSrc: string }) => {
    const pushVideoElement = useRef<HTMLVideoElement>(null);
    const pullVideoElement = useRef<HTMLVideoElement>(null);
    // Get video stream track.
    const videoStreamTrack = useVideoStreamTrack(pushVideoElement, videoSrc);
    const { pulledTrack, rePullTrack, metrics } = pushAndPullTrack(videoStreamTrack);
    const hadRun = useRef(false);

    // Push/pull video stream track to cloudflare.
    useEffect(() => {
      if (pulledTrack || hadRun.current) {
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
      <div className='grid grid-cols-3 gap-4 items-center'>
        <video ref={pushVideoElement} muted autoPlay loop />
        <Json data={metrics} />
        <div className='flex flex-col gap-4'>
          <video ref={pullVideoElement} muted />
          <Button
            disabled={
              !(
                pullVideoElement?.current?.srcObject instanceof MediaStream &&
                pullVideoElement.current.srcObject.getTracks()[0]
              )
            }
            onClick={rePullTrack}
          >
            Re-pull video
          </Button>
        </div>
      </div>
    );
  },
  args: {
    videoSrc: video,
  },
};

export const InaudibleAudioStreamTrack = {
  render: () => {
    const audioStreamTrack = useInaudibleAudioStreamTrack();

    const { rePullTrack, metrics } = pushAndPullTrack(audioStreamTrack);

    return (
      <div className='grid grid-cols-3 gap-4 items-center'>
        <Json data={metrics} />
        <Button onClick={rePullTrack}>Re-pull audio</Button>
      </div>
    );
  },
};
