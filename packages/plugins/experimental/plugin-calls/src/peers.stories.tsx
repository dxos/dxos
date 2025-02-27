//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';
import { of, tap, switchMap, delay } from 'rxjs';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Config, useConfig } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { usePeerConnection, useStablePojo } from './hooks';
// @ts-ignore
import video from './tests/assets/video.mp4';
import { CALLS_URL } from './types';

const useVideoStreamTrack = (videoElement: HTMLVideoElement | null) => {
  // Get video stream track
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
      log.info('Captured stream', { stream });
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
  const peerConfig = useStablePojo({
    iceServers: config.get('runtime.services.ice'),
    apiBase: `${CALLS_URL}/api/calls`,
  });

  const { peer: peerPush } = usePeerConnection(peerConfig);
  const { peer: peerPull } = usePeerConnection(peerConfig);

  const pushVideoElement = useRef<HTMLVideoElement>(null);
  const pullVideoElement = useRef<HTMLVideoElement>(null);
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  // Get video stream track
  const videoStreamTrack = useVideoStreamTrack(pushVideoElement.current);

  // Push/pull video stream track to cloudflare.
  useEffect(() => {
    if (!videoStreamTrack) {
      log.info('no videoStreamTrack');
      return;
    }

    log.info('starting push/pull', { videoStreamTrack });

    // Push track to cloudflare.
    const pushedTrackObservable = peerPush.pushTrack(
      of(videoStreamTrack).pipe(
        tap((track) => {
          performance.mark('push:begin');
          log.info('start push track', { track });
        }),
      ),
    );

    // Pull track from cloudflare.
    const pulledTrackObservable = peerPull.pullTrack(
      pushedTrackObservable.pipe(
        // We need to wait for the track to be available on the call.
        delay(500),
        switchMap((track) => {
          performance.mark('pullTrack:begin');
          delete track.mid;
          return of(track);
        }),
      ),
    );

    // Play pulled track.
    const subscription = pulledTrackObservable.subscribe((track) => {
      if (!track) {
        log.info('no pulled track');
        return;
      }

      // Measure time to pull track.
      {
        performance.mark('pullTrack:end');
        const pullTime = performance.measure('pullTrack', 'pullTrack:begin', 'pullTrack:end').duration;
        setMetrics((prev) => ({ ...prev, 'time to pull track [ms]': pullTime }));
        log.info('successfully pulled track', {
          track,
          pullTime: performance.measure('pullTrack', 'pullTrack:begin', 'pullTrack:end').duration,
        });
      }

      invariant(pullVideoElement.current);
      performance.mark('playVideo:begin');
      pullVideoElement.current.srcObject = new MediaStream([track]);
      pullVideoElement.current
        .play()
        .then(() => {
          performance.mark('playVideo:end');
          const playTime = performance.measure('playVideo', 'playVideo:begin', 'playVideo:end').duration;
          setMetrics((prev) => ({ ...prev, 'time to play pulled video [ms]': playTime }));
        })
        .catch((err) => {
          log.error('Error playing video', { err });
        });
    });

    return () => subscription?.unsubscribe();
  }, [videoStreamTrack]);

  return (
    <div className='flex flex-col gap-4 w-[400px] justify-center'>
      <video ref={pushVideoElement} muted autoPlay src={video} />
      <video ref={pullVideoElement} muted />
      <Json data={metrics} />
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
