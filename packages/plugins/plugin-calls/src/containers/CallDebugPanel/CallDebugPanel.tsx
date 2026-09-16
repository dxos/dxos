//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { WebRTCStats, type WebRTCStatsEvent } from '@peermetrics/webrtc-stats';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useEffect, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { truncateKey } from '@dxos/debug';
import { JsonView, STAT_CARD_HUES, StatCard } from '@dxos/devtools';
import { log } from '@dxos/log';
import { Field, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { CallsCapabilities } from '#types';

import { type EncodedTrackName, type GlobalState } from '../../calls/index.ts';

// Stand-in so `useAtomValue` is always called with a real atom when no manager is contributed.
const noCallState = Atom.make<GlobalState | undefined>(undefined).pipe(Atom.keepAlive);

export type CallDebugPanelProps = ThemedClassName<{
  /** Overrides the live manager state; used by stories to render fixtures. */
  state?: GlobalState;
}>;

/** The call's status as a card in the devtools stats stack. */
export const CallDebugPanel = ({ state: stateOverride }: CallDebugPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  // `useCapabilities` tolerates the manager being absent, which is the case in stories.
  const [manager] = useCapabilities(CallsCapabilities.Manager);
  const liveState = useAtomValue(manager?.stateAtom ?? noCallState);
  const state = stateOverride ?? liveState;

  const [showServiceHistory, setShowServiceHistory] = useState(false);
  const [showDetailedWebRTCStats, setShowDetailedWebRTCStats] = useState(false);

  const webrtcStats = useMemo(() => new WebRTCStats({ getStatsInterval: 1000 }), []);
  const [stats, setStats] = useState<WebRTCStatsEvent['data']>();

  useEffect(() => {
    const pc = state?.media.peer?.session?.peerConnection;
    const handleStats = (stats: WebRTCStatsEvent) => {
      setStats(stats.data);
    };
    let added = false;
    if (pc && showDetailedWebRTCStats) {
      webrtcStats.addConnection({ pc, peerId: 1, connectionId: '1' });
      webrtcStats.on('stats', handleStats as never);
      added = true;
    }
    return () => {
      try {
        if (pc && added) {
          webrtcStats.removeConnection({ pc });
          webrtcStats.removeListener('stats', handleStats as never);
        }
      } catch (error) {
        log.error('error removing webrtc stats', { error, pc, peerId: 1, connectionId: '1' });
      }
    };
  }, [state?.media.peer?.session?.peerConnection, showDetailedWebRTCStats]);

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
        action={<Field.Switch checked={showDetailedWebRTCStats} onCheckedChange={setShowDetailedWebRTCStats} />}
      />
      <StatCard.Row
        label={t('show-calls-history.title')}
        action={<Field.Switch checked={showServiceHistory} onCheckedChange={setShowServiceHistory} />}
      />
      {showDetailedWebRTCStats && (
        <StatCard.Content>
          <JsonView data={{ stats }} />
        </StatCard.Content>
      )}
      {showServiceHistory && (
        <StatCard.Content>
          <JsonView data={{ history: state?.media.peer?.history.get() }} />
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
      const audio =
        user.tracks?.audio &&
        state.media.pulledAudioTracks[user.tracks.audio as EncodedTrackName]?.ctx.disposed === false;
      const video =
        user.tracks?.video &&
        state.media.pulledVideoStreams[user.tracks.video as EncodedTrackName]?.ctx.disposed === false;
      const screenshare =
        user.tracks?.screenshare &&
        state.media.pulledVideoStreams[user.tracks.screenshare as EncodedTrackName]?.ctx.disposed === false;
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
    { label: 'ICE', value: state.media.peer?.session?.peerConnection.iceConnectionState ?? 'no connection' },
  ];
};
