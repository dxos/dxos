//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
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

const JOIN_TIMEOUT = 10_000;

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
  // Each attempt rejoins from the top; a click starts the next one where the browser refused to autoplay the last.
  const [attempt, setAttempt] = useState(0);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setBlocked(false);
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
    // A blocked autoplay either rejects or leaves `AudioContext.resume()` pending until a gesture, so a stall counts too.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stalled = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new DOMException('Autoplay stalled', 'NotAllowedError')), JOIN_TIMEOUT);
    });
    let cancelled = false;
    void Promise.race([join(), stalled])
      .then(() => clearTimeout(timer))
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setBlocked(true);
        } else {
          log.catch(err);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      void callManager.leave();
      void callManager.simulate(undefined);
      restore?.();
    };
  }, [callManager, media, attempt]);

  if (blocked) {
    return (
      <div className='grid h-full place-items-center'>
        <Button.Root icon='ph--phone--regular' label='Join the call' onClick={() => setAttempt((value) => value + 1)} />
      </div>
    );
  }

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
          'Tracks come from `.agents/skills/autocue/scripts/conversation.mjs`; serve them at `media` (copy them to `tools/storybook-react/static/simulated-call/` for the default). Where the browser blocks autoplay the call waits for a click on Join.',
      },
    },
  },
  args: { media: '/simulated-call' },
} satisfies Meta<typeof SimulatedStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
