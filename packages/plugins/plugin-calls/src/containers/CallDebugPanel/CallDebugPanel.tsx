//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { truncateKey } from '@dxos/debug';
import { JsonView, STAT_CARD_HUES, StatCard } from '@dxos/devtools';
import { log } from '@dxos/log';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import type * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';
import { CallsCapabilities } from '#types';

import { type EncodedTrackName, type GlobalState, type MediaStats } from '../../calls/index.ts';

// Stand-in so `useAtomValue` is always called with a real atom when no manager is contributed.
const noCallState = Atom.make<GlobalState | undefined>(undefined).pipe(Atom.keepAlive);

export type CallDebugPanelProps = Util.ThemedClassName<{
  /** Overrides the live manager state; used by stories to render fixtures. */
  state?: GlobalState;
}>;

/** The call's status as a card in the devtools stats stack. */
export const CallDebugPanel = ({ state: stateOverride }: CallDebugPanelProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  // `useCapabilities` tolerates the manager being absent, which is the case in stories.
  const [manager] = Hooks.useCapabilities(CallsCapabilities.Manager);
  const liveState = useAtomValue(manager?.stateAtom ?? noCallState);
  const state = stateOverride ?? liveState;

  // Polls the transport's send-side stats only while the switch is on and a session is live.
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<MediaStats>();
  const peer = state?.media.peer;
  useEffect(() => {
    if (!showStats || !peer) {
      setStats(undefined);
      return;
    }
    let active = true;
    const poll = () =>
      void peer.getStats?.().then(
        (next) => active && setStats(next),
        (error) => log.catch(error),
      );
    poll();
    const interval = setInterval(poll, 1_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showStats, peer]);

  const rows = useMemo(() => getCallStatusRows(state), [state?.call.users, state?.media.pulledAudioTracks]);

  const handleCopyRaw = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ users: state?.call?.users, stats }, null, 2));
  };

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--video-conference--regular'
        hue={STAT_CARD_HUES.edge}
        title={t('meeting-status.title')}
        info={state?.call.joined ? 'active' : 'inactive'}
        menu={[{ label: 'Copy raw', icon: 'ph--copy--regular', onClick: () => void handleCopyRaw() }]}
      />
      {rows.map((row, index) => (
        <StatCard.Row key={index} label={row.label} tooltip={row.label} value={row.value} />
      ))}
      <StatCard.Row
        label={t('show-webrtc-stats.title')}
        action={<Input.Switch checked={showStats} onCheckedChange={({ checked }) => setShowStats(checked)} />}
      />
      {showStats && (
        <StatCard.Content>
          <JsonView data={{ stats }} />
        </StatCard.Content>
      )}
    </StatCard.Root>
  );
};

CallDebugPanel.displayName = 'CallDebugPanel';

type StatusRow = { label: string; value: string };

const trackStatus = (label: string, ok: unknown, enabled = true): string | undefined =>
  enabled ? `${label} ${ok ? '✓' : '✗'}` : undefined;

const getCallStatusRows = (state?: GlobalState): StatusRow[] => {
  if (!state || !state.call?.users) {
    return [];
  }

  const self = state.call.self;
  const userRows = state.call.users
    .filter((user) => user.id !== self?.id)
    .map((user) => {
      // The cache holds only live remote tracks (dropped when the peer leaves), so presence means playable.
      const audio = user.tracks?.audio && !!state.media.pulledAudioTracks[user.tracks.audio as EncodedTrackName];
      const video = user.tracks?.video && !!state.media.pulledVideoStreams[user.tracks.video as EncodedTrackName];
      const screenshare =
        user.tracks?.screenshare && !!state.media.pulledVideoStreams[user.tracks.screenshare as EncodedTrackName];
      return {
        label: user.name ?? truncateKey(user.id, 8),
        value: [
          trackStatus('AUD', audio),
          trackStatus('VID', video),
          trackStatus('SCR', screenshare, !!user.tracks?.screenshareEnabled),
        ]
          .filter(Boolean)
          .join(' '),
      };
    });

  return [
    { label: 'Users', value: String(state.call.users.length ?? 0) },
    ...(self
      ? [
          {
            label: `self: ${self.name ?? truncateKey(self.id, 8)}`,
            value: [
              trackStatus('AUD', self.tracks?.audio && state.media.pushedAudioTrack),
              trackStatus('VID', self.tracks?.video && state.media.pushedVideoTrack),
              trackStatus(
                'SCR',
                self.tracks?.screenshareEnabled && state.media.pushedScreenshareTrack,
                !!self.tracks?.screenshareEnabled,
              ),
            ]
              .filter(Boolean)
              .join(' '),
          },
        ]
      : []),
    ...userRows,
    { label: 'Media', value: state.media.peer?.isOpen ? 'connected' : 'no connection' },
  ];
};
