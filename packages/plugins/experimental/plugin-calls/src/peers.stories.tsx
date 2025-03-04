//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { scheduleTask, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Config, useConfig } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useCallsService } from './hooks';
import { CALLS_URL } from './types';
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

const Render = ({ videoSrc }: { videoSrc: string }) => {
  const config = useConfig();
  const callsConfig = {
    iceServers: config.get('runtime.services.ice'),
    apiBase: `${CALLS_URL}/api/calls`,
  };

  const { peer: peerPush } = useCallsService(callsConfig);
  const { peer: peerPull } = useCallsService(callsConfig);

  const pushVideoElement = useRef<HTMLVideoElement>(null);
  const pullVideoElement = useRef<HTMLVideoElement>(null);
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  // Get video stream track.
  const videoStreamTrack = useVideoStreamTrack(pushVideoElement.current);

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

      // performance.mark('webrtc:begin');
      // performance.mark('webrtc:end');
      // const webrtcTime = performance.measure('webrtc', 'webrtc:begin', 'webrtc:end').duration;
      // setMetrics((prev) => ({ ...prev, 'time to open webrtc [ms]': Math.round(webrtcTime) }));

      // Push track to cloudflare.
      performance.mark('push:begin');
      const pushedTrack = await peerPush.pushTrack({ track: videoStreamTrack });
      performance.mark('push:end');
      const pushTime = performance.measure('push', 'push:begin', 'push:end').duration;
      log.info('successfully pushed track', { pushTime, pushedTrack });
      setMetrics((prev) => ({ ...prev, 'time to push track [ms]': Math.round(pushTime) }));

      // Wait for cloudflare to process the track.
      await sleep(500);

      // Pull track from cloudflare.
      performance.mark('pullTrack:begin');
      const pulledTrack = await peerPull.pullTrack({ trackData: { ...pushedTrack, mid: undefined } });
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

  return (
    <div className='grid grid-cols-3 gap-4 items-center'>
      <video ref={pushVideoElement} muted autoPlay src={video} />
      <Json data={metrics} />
      <video ref={pullVideoElement} muted />
    </div>
  );
};

const meta: Meta<typeof Render> = {
  title: 'plugins/plugin-calls/peers',
  render: Render,
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

type Story = StoryObj<typeof Render>;

export const Default: Story = {
  args: {
    videoSrc: video,
  },
};
