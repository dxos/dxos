//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { log } from '@dxos/log';
import { Avatar } from '@dxos/react-ui-experimental';
import { withLayout } from '@dxos/react-ui/testing';

import { CallsCapabilities } from '#types';

import { type SimulatedAvatar, type SimulatedAvatarRenderer } from '../../calls/call-simulation.ts';
import { fakeUserMedia, withCallManager } from '../../testing/index.ts';
import { Lobby } from '../Lobby/index.ts';
import { Call } from './Call.tsx';

const LOCAL = 'Astrid Holm';
type Participant = { name: string; track: string; avatar?: boolean | SimulatedAvatar };

const COLLEAGUES: Participant[] = [
  { name: 'Lucía Ferreira', track: 'lucia' },
  { name: 'Ben Achterberg', track: 'ben' },
  { name: 'Tomás Vidal', track: 'tomas' },
];
/** An agent with no camera: its tile is an abstract shape that moves with its synthesized voice. */
const AGENT: Participant = { name: 'Composer', track: 'agent', avatar: true };
/** The agent as it appears standing in for a colleague. */
const STAND_IN = {
  name: 'Composer',
  avatar: { visualization: 'ink', config: Avatar.inkPresets.navy },
} satisfies Omit<Participant, 'track'>;

/** Draws an avatar participant with react-ui-experimental's agent visualizations, driven by its voice track. */
const renderAvatar: SimulatedAvatarRenderer = async (context, track, { visualization, config }) =>
  Avatar.createAgentVisualization({
    visualization: Avatar.getVisualization(visualization) ?? Avatar.orb,
    config,
    providers: [new Avatar.AudioProvider(context, track)],
  });

/** The parts of `conversation.mjs`'s `timeline.json` the story reads. */
type Timeline = { screenshares?: { speaker: string; start: number; file: string }[] };

type StoryProps = {
  /** Base URL of the conversation's tracks: `astrid.webm`, `lucia.webm`, `ben.webm`, `tomas.webm`, and `timeline.json`, whose
   * `screenshares` name the screen recordings participants share. */
  media: string;
  /** Adds the agent, whose voice is `agent.webm` (audio only). */
  agent?: boolean;
  /** A colleague's track (e.g. `tomas`) the agent stands in for: their tile becomes the agent's avatar, which speaks
   * their lines. */
  standIn?: string;
};

/**
 * A four-person call with no network: three simulated participants and a local camera, each played from a track of
 * one scripted conversation, so the call starts in step and the speaking outline follows whoever is talking.
 * Nothing plays until Join, whose click is also the gesture the browser needs to play sound; Leave stops the call
 * and resets it to the lobby.
 */
const SimulatedStory = ({ media, agent, standIn }: StoryProps) => {
  const callManager = Hooks.useCapability(CallsCapabilities.Manager);
  const joined = useAtomValue(callManager.joinedAtom);
  const participants = COLLEAGUES.length + (agent ? 1 : 0);
  // Each session loads the files paused; leaving starts the next one, so a rejoin plays from the top.
  const [session, setSession] = useState(0);
  const [ready, setReady] = useState<{ start: () => Promise<void> }>();

  useEffect(() => {
    setReady(undefined);
    let restore: (() => void) | undefined;
    let cancelled = false;
    // The setup keeps running after cleanup, so it stops at its next step once it is stale.
    const live = () => {
      if (cancelled) {
        throw new DOMException('Session superseded', 'AbortError');
      }
    };
    const prepare = async () => {
      const local = await fakeUserMedia(`${media}/astrid.webm`);
      restore = local.restore;
      live();
      const timeline: Timeline | undefined = await fetch(`${media}/timeline.json`)
        .then((response) => (response.ok ? response.json() : undefined))
        .catch(() => undefined);
      live();
      await callManager.simulate(
        [
          ...COLLEAGUES.map((colleague) => (colleague.track === standIn ? { ...colleague, ...STAND_IN } : colleague)),
          ...(agent ? [AGENT] : []),
        ].map(({ name, track, avatar }) => {
          const share = timeline?.screenshares?.find(({ speaker }) => speaker === track);
          return {
            name,
            src: `${media}/${track}.webm`,
            ...(avatar ? { avatar } : {}),
            ...(share ? { screenshare: { src: `${media}/${share.file}`, start: share.start } } : {}),
          };
        }),
        undefined,
        renderAvatar,
      );
      live();
      callManager.setRoomId('story-room');
      await callManager.turnVideoOn();
      await callManager.turnAudioOn();
      live();
      setReady({ start: local.start });
    };
    void prepare().catch((err) => {
      if (cancelled) {
        // Media a stale setup acquired after cleanup ran is released here.
        restore?.();
        restore = undefined;
      } else {
        log.catch(err);
      }
    });

    return () => {
      cancelled = true;
      void callManager.leave();
      void callManager.simulate(undefined);
      restore?.();
      restore = undefined;
    };
  }, [callManager, media, agent, standIn, session]);

  const handleJoin = async () => {
    await callManager.join();
    await ready?.start();
  };

  const handleLeave = () => setSession((value) => value + 1);

  if (!joined) {
    return (
      <Lobby.Root>
        <Lobby.Preview />
        <Lobby.Toolbar
          roomId='story-room'
          participants={participants}
          joinDisabled={!ready}
          onJoin={() => void handleJoin().catch((err) => log.catch(err))}
        />
      </Lobby.Root>
    );
  }

  return (
    <Call.Root>
      <Call.Viewport>
        <Call.Grid />
        <Call.Toolbar onLeave={handleLeave} />
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
          'Tracks come from `.agents/skills/autocue/scripts/conversation.mjs`; serve them at `media` (copy them to `tools/storybook-react/static/simulated-call/` for the default). Nothing plays until Join; Leave resets the call to the lobby.',
      },
    },
  },
  args: { media: '/simulated-call' },
} satisfies Meta<typeof SimulatedStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAgent: Story = {
  args: { agent: true },
};

export const AgentStandIn: Story = {
  args: { standIn: 'tomas' },
};
