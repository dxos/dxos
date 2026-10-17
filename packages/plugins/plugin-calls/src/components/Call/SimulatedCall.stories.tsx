//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { log } from '@dxos/log';
import { withLayout } from '@dxos/react-ui/testing';

import { CallsCapabilities } from '#types';

import { fakeUserMedia, withCallManager } from '../../testing/index.ts';
import { Call } from './Call.tsx';

const LOCAL = 'Astrid Holm';
const COLLEAGUES = [
  { name: 'Lucía Ferreira', track: 'lucia' },
  { name: 'Ben Achterberg', track: 'ben' },
  { name: 'Tomás Vidal', track: 'tomas' },
];

type StoryProps = {
  /** Base URL of the conversation's tracks: `astrid.webm`, `lucia.webm`, `ben.webm`, `tomas.webm`. */
  media: string;
};

/**
 * A four-person call with no network: three simulated participants and a local camera, each played from a track of
 * one scripted conversation, so the call starts in step and the speaking outline follows whoever is talking.
 */
const SimulatedStory = ({ media }: StoryProps) => {
  const callManager = Hooks.useCapability(CallsCapabilities.Manager);
  useEffect(() => {
    let restore: (() => void) | undefined;
    const join = async () => {
      const local = await fakeUserMedia(`${media}/astrid.webm`);
      restore = local.restore;
      await callManager.simulate(COLLEAGUES.map(({ name, track }) => ({ name, src: `${media}/${track}.webm` })));
      callManager.setRoomId('story-room');
      await callManager.turnVideoOn();
      await callManager.turnAudioOn();
      await callManager.join();
      await local.start();
    };
    void join().catch((err) => log.catch(err));

    return () => {
      void callManager.leave();
      void callManager.simulate(undefined);
      restore?.();
    };
  }, [callManager, media]);

  return (
    <Call.Root>
      <Call.Viewport>
        <Call.Grid />
        <Call.Toolbar onLeave={() => callManager.leave()} />
      </Call.Viewport>
    </Call.Root>
  );
};

const meta = {
  title: 'plugins/plugin-calls/components/SimulatedCall',
  render: SimulatedStory,
  decorators: [withCallManager({ displayName: LOCAL }), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Tracks come from `.agents/skills/autocue/scripts/conversation.mjs`; serve them at `media`. The players need autoplay, which Chromium allows only after a gesture unless launched with `--autoplay-policy=no-user-gesture-required`.',
      },
    },
  },
  args: { media: '/simulated-call' },
} satisfies Meta<typeof SimulatedStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
