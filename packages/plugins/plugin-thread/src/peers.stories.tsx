//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';

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
// @ts-ignore
import video from '../testing/video.mp4';

const useVideoStreamTrack = (videoElement: HTMLVideoElement | null) => {
  // Get video stream track.
  const [videoStreamTrack, setVideoStreamTrack] = useState<MediaStreamTrack | undefined>(undefined);
  const hadRun = useRef(false);
  useEffect(() => {
    // This is done to capture only one video stream.
    if (!videoElement || hadRun.current || !video) {
      return;
    }
    hadRun.current = true;

    videoElement.src = video;
    videoElement.addEventListener('playing', () => {
      const stream = (videoElement as any).captureStream();
      log.info('captured stream', { stream });
      stream.onaddtrack = (event: MediaStreamTrackEvent) => {
        if (event.track.kind === 'video') {
          log.info('video stream track state', { state: event.track.readyState });
          setVideoStreamTrack(event.track);
        }
      };
    });
  }, [videoElement]);

  return videoStreamTrack;
};

const DefaultStory = ({ videoSrc }: { videoSrc: string }) => {
  const config = useConfig();
  const callsConfig = {
    iceServers: config.get('runtime.services.ice'),
    apiBase: `${CALLS_URL}/api/calls`,
  };
  const peerPush = useMemo(() => new CallsServicePeer(callsConfig), []);
  const peerPull = useMemo(() => new CallsServicePeer(callsConfig), []);
  const pushVideoElement = useRef<HTMLVideoElement>(null);
  const pullVideoElement = useRef<HTMLVideoElement>(null);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  // Get video stream track.
  const videoStreamTrack = useVideoStreamTrack(pushVideoElement.current);
  const pullCtx = useRef<Context | undefined>(undefined);
  const trackInfo = useRef<TrackObject | undefined>(undefined);
  const hadRun = useRef(false);

  // Push/pull video stream track to cloudflare.
  useEffect(() => {
    if (hadRun.current || !videoStreamTrack || !peerPush || !peerPull) {
      return;
    }
    hadRun.current = true;
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      log.info('starting push/pull', { videoStreamTrack });
      await peerPush.open();
      await peerPull.open();
      ctx.onDispose(() => {
        void peerPush.close();
        void peerPull.close();
      });

      // Push track to cloudflare.
      performance.mark('push:begin');
      const pushedTrack = await peerPush.pushTrack({ track: videoStreamTrack });
      trackInfo.current = pushedTrack;
      performance.mark('push:end');
      const pushTime = performance.measure('push', 'push:begin', 'push:end').duration;
      log.info('successfully pushed track', { pushTime, pushedTrack });
      setMetrics((prev) => ({ ...prev, 'time to push track [ms]': Math.round(pushTime) }));

      // Wait for cloudflare to process the track.
      await sleep(500);

      // Pull track from cloudflare.
      performance.mark('pullTrack:begin');
      pullCtx.current = new Context();
      const pulledTrack = await peerPull.pullTrack({
        trackData: { ...pushedTrack, mid: undefined },
        ctx: pullCtx.current,
      });
      performance.mark('pullTrack:end');
      const pullTime = performance.measure('pullTrack', 'pullTrack:begin', 'pullTrack:end').duration;
      setMetrics((prev) => ({ ...prev, 'time to pull track [ms]': Math.round(pullTime) }));
      log.info('successfully pulled track', { pullTime, pulledTrack });

      invariant(pulledTrack);
      invariant(pullVideoElement.current);
      performance.mark('playVideo:begin');
      pullVideoElement.current.srcObject = new MediaStream([pulledTrack]);
      await pullVideoElement.current.play();
      performance.mark('playVideo:end');
      const playTime = performance.measure('playVideo', 'playVideo:begin', 'playVideo:end').duration;
      setMetrics((prev) => ({ ...prev, 'time to play pulled video [ms]': Math.round(playTime) }));
    });

    return () => {
      void ctx.dispose();
    };
  }, [videoStreamTrack, peerPush, peerPull]);

  const handleRePullVideo = async () => {
    performance.mark('rePullVideo:begin');
    invariant(pullVideoElement.current);
    invariant(pullVideoElement.current.srcObject instanceof MediaStream);
    const pulledTrack = pullVideoElement.current.srcObject.getTracks()[0];
    invariant(pulledTrack);
    pullVideoElement.current.srcObject.removeTrack(pulledTrack);
    await pullCtx.current!.dispose();
    pulledTrack.stop();
    pullCtx.current = new Context();
    const newPulledTrack = await peerPull.pullTrack({
      trackData: { ...trackInfo.current!, mid: undefined },
      ctx: pullCtx.current,
    });
    invariant(newPulledTrack);
    pullVideoElement.current.srcObject.addTrack(newPulledTrack);
    performance.mark('rePullVideo:end');
    const rePullTime = performance.measure('rePullVideo', 'rePullVideo:begin', 'rePullVideo:end').duration;
    setMetrics((prev) => ({ ...prev, 'time to re-pull video [ms]': Math.round(rePullTime) }));
  };

  return (
    <div className='grid grid-cols-3 gap-4 items-center'>
      <video ref={pushVideoElement} muted autoPlay src={video} loop />
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
          onClick={handleRePullVideo}
        >
          Re-pull video
        </Button>
      </div>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-thread/peers',
  render: DefaultStory,
  decorators: [
    withClientProvider({
      config: new Config({ runtime: { services: { iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }] } } }),
    }),
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {
  args: {
    videoSrc: video,
  },
};
