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

import { CallsCapabilities } from '#types';

import { type GlobalState, type MediaStats, remoteTrackKey } from '../../calls/index.ts';
import { CallsNamespace } from '../../namespace.ts';

// Stand-in so `useAtomValue` is always called with a real atom when no manager is contributed.
const noCallState = Atom.make<GlobalState | undefined>(undefined).pipe(Atom.keepAlive);

export type CallDebugPanelProps = Util.ThemedClassName<{
  /** Overrides the live manager state; used by stories to render fixtures. */
  state?: GlobalState;
}>;

/** The call's status as a card in the devtools stats stack. */
export const CallDebugPanel = ({ state: stateOverride }: CallDebugPanelProps) => {
  const { t } = UiHooks.useTranslation(CallsNamespace.key);
  // `useCapabilities` tolerates the manager being absent, which is the case in stories.
  const [manager] = Hooks.useCapabilities(CallsCapabilities.Manager);
  const liveState = useAtomValue(manager?.stateAtom ?? noCallState);
  const state = stateOverride ?? liveState;

  // Polls the transport's send-side stats only while the switch is on and a session is live.
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<MediaStats>();
  const transport = state?.media.transport;
  useEffect(() => {
    if (!showStats || !transport) {
      setStats(undefined);
      return;
    }
    let active = true;
    const poll = () =>
      void transport.getStats().then(
        (next) => active && setStats(next),
        (error) => log.catch(error),
      );
    poll();
    const interval = setInterval(poll, 1_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showStats, transport]);

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
      const id = user.id ?? '';
      const audio = user.tracks?.audioEnabled && !!state.media.pulledAudioTracks[remoteTrackKey(id, 'audio')];
      const video = user.tracks?.videoEnabled && !!state.media.pulledVideoStreams[remoteTrackKey(id, 'video')];
      const screenshare =
        user.tracks?.screenshareEnabled && !!state.media.pulledVideoStreams[remoteTrackKey(id, 'screenshare')];
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
              trackStatus('AUD', self.tracks?.audioEnabled && state.media.audioTrack),
              trackStatus('VID', self.tracks?.videoEnabled && state.media.videoTrack),
              trackStatus(
                'SCR',
                self.tracks?.screenshareEnabled && state.media.screenshareTrack,
                !!self.tracks?.screenshareEnabled,
              ),
            ]
              .filter(Boolean)
              .join(' '),
          },
        ]
      : []),
    ...userRows,
    { label: 'Media', value: state.media.transport?.isOpen ? 'connected' : 'no connection' },
  ];
};
