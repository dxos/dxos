//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';
import { of, tap, type Subscription } from 'rxjs';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Config, useConfig } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { usePeerConnection } from './hooks';
import { CALLS_URL } from './types';

const Render = ({ videoUrl }: { videoUrl: string }) => {
  const config = useConfig();

  const { peer: peerPush } = usePeerConnection({
    iceServers: config.get('runtime.services.ice'),
    apiBase: `${CALLS_URL}/api/calls`,
  });

  const { peer: peerPull } = usePeerConnection({
    iceServers: config.get('runtime.services.ice'),
    apiBase: `${CALLS_URL}/api/calls`,
  });

  const pushVideoElement = useRef<HTMLVideoElement>(null);
  const pullVideoElement = useRef<HTMLVideoElement>(null);

  const [videoStreamTrack, setVideoStreamTrack] = useState<MediaStreamTrack | undefined>(undefined);

  useEffect(() => {
    let subscription: Subscription | undefined;
    if (pushVideoElement.current) {
      const stream = (pushVideoElement.current as any).captureStream();
      stream.onaddtrack = () => {
        setVideoStreamTrack(stream.getVideoTracks()[0]);
        log.info('videoStreamTrack');
      };
    }

    return () => subscription?.unsubscribe();
  }, [pushVideoElement.current]);

  useEffect(() => {
    if (!videoStreamTrack) {
      log.info('no videoStreamTrack');
      return;
    }

    log.info('starting push/pull', { videoStreamTrack });
    const pushedTrackObservable = peerPush.pushTrack(
      of(videoStreamTrack).pipe(tap((track) => log.info('start push track', { track }))),
    );
    const pulledTrackObservable = peerPull.pullTrack(
      pushedTrackObservable.pipe(tap((track) => log.info('start pull track', { track }))),
    );
    const subscription = pulledTrackObservable.subscribe((track) => {
      log.info('successfully pulled track', { track });
      invariant(pullVideoElement.current);
      pullVideoElement.current.srcObject = new MediaStream([track]);
    });

    return () => subscription?.unsubscribe();
  }, [videoStreamTrack]);

  return (
    <div className='flex flex-col gap-4 w-[400px] justify-center'>
      <video ref={pushVideoElement} autoPlay muted src={videoUrl} />
      <video ref={pullVideoElement} autoPlay muted />
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
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
};
