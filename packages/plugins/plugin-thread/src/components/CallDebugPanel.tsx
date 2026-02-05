//
// Copyright 2024 DXOS.org
//

import { WebRTCStats, type WebRTCStatsEvent } from '@peermetrics/webrtc-stats';
import React, { useEffect, useMemo, useState } from 'react';

import { truncateKey } from '@dxos/debug';
import { JsonView, Panel } from '@dxos/devtools';
import { log } from '@dxos/log';
import { IconButton, Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { type EncodedTrackName, type GlobalState } from '../calls';
import { meta } from '../meta';

export type CallDebugPanelProps = ThemedClassName<{ state?: GlobalState }>;

export const CallDebugPanel = ({ state }: CallDebugPanelProps) => {
  const { t } = useTranslation(meta.id);

  const [open, setOpen] = useState(false);
  const handleToggle = () => setOpen(!open);
  const [showServiceHistory, setShowServiceHistory] = useState(false);
  const handleToggleServiceHistory = () => setShowServiceHistory(!showServiceHistory);

  const handleCopyRaw = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ users: state?.call?.users, stats }, null, 2));
  };

  const [showDetailedWebRTCStats, setShowDetailedWebRTCStats] = useState(false);
  const handleShowDetailedWebRTCStats = () => setShowDetailedWebRTCStats(!showDetailedWebRTCStats);

  const webrtcStats = useMemo(
    () =>
      new WebRTCStats({
        getStatsInterval: 1000,
      }),
    [],
  );
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

  const rows = useMemo(() => getCallStatusTable(state), [state?.call.users, state?.media.pulledAudioTracks]);

  return (
    <Panel
      id='meeting-status'
      icon='ph--video-conference--regular'
      open={open}
      onToggle={handleToggle}
      title={t('meeting status title')}
      info={<div className='flex items-center gap-2'> {state?.call.joined ? 'Active' : 'Inactive'}</div>}
      maxHeight={0}
    >
      <div className='flex flex-col is-full text-xs'>
        <div className='flex items-center gap-2 items-center'>
          <Input.Root>
            <Input.Switch checked={showDetailedWebRTCStats} onCheckedChange={handleShowDetailedWebRTCStats} />
            <Input.Label>{t('show webrtc stats title')}</Input.Label>
          </Input.Root>
        </div>
        <div className='flex items-center gap-2 items-center'>
          <Input.Root>
            <Input.Switch checked={showServiceHistory} onCheckedChange={handleToggleServiceHistory} />
            <Input.Label>{t('show calls history title')}</Input.Label>
          </Input.Root>
        </div>
        <div className='flex items-center gap-2 items-center'>
          <IconButton icon='ph--copy--regular' label={'copy raw'} onClick={handleCopyRaw} />
        </div>
        <Table rows={rows} />
        {showDetailedWebRTCStats && <JsonView data={{ stats }} />}
        {showServiceHistory && <JsonView data={{ history: state?.media.peer?.history.get() }} />}
      </div>
    </Panel>
  );
};

const getCallStatusTable = (state?: GlobalState): TableProps['rows'] => {
  if (!state || !state.call?.users) {
    return [];
  }

  const self = state.call.self;
  const users = state.call.users
    .filter((user) => user.id !== self!.id)
    .map((user) => {
      const isOk = {
        audio:
          user.tracks?.audio &&
          state.media.pulledAudioTracks[user.tracks?.audio as EncodedTrackName]?.ctx.disposed === false,
        video:
          user.tracks?.video &&
          state.media.pulledVideoStreams[user.tracks?.video as EncodedTrackName]?.ctx.disposed === false,
        screenshare:
          user.tracks?.screenshare &&
          state.media.pulledVideoStreams[user.tracks?.screenshare as EncodedTrackName]?.ctx.disposed === false,
      };

      return {
        ...user,
        isOk,
      };
    });

  return [
    ['users', state.call.users.length ?? 0],
    [
      '*self* ' + (self?.name ?? truncateKey(self!.id, 8)),
      self?.tracks?.audio && state.media.pushedAudioTrack ? 'AUD ✅' : 'AUD ❌',
      self?.tracks?.video && state.media.pushedVideoTrack ? 'VID ✅' : 'VID ❌',
      self?.tracks?.screenshareEnabled
        ? self.tracks.screenshareEnabled && state.media.pushedScreenshareTrack
          ? 'SCR ✅'
          : 'SCR ❌'
        : undefined,
    ],

    ...users.map((user) => [
      user.name ?? truncateKey(user.id, 8),
      user.isOk.audio ? 'AUD ✅' : 'AUD ❌',
      user.isOk.video ? 'VID ✅' : 'VID ❌',
      user.tracks?.screenshareEnabled ? (user.isOk.screenshare ? 'SCR ✅' : 'SCR ❌') : undefined,
    ]),
    ['ICE', state.media.peer?.session?.peerConnection.iceConnectionState ?? 'no connection'],
  ];
};

export namespace Unit {
  export const KB = (n?: number) => ((n ?? 0) / 1_000).toFixed(2);
}

export type TableProps = {
  rows: (string | number | undefined)[][];
};

export const Table = ({ rows }: TableProps) => {
  return (
    <div className='is-full text-xs font-mono'>
      {rows.map(([prefix, label, value, unit], i) => (
        <div key={i} className='grid grid-cols-[3fr_1fr_1fr_1fr]'>
          <div className='p-1'>{prefix}</div>
          <div className='p-1'>{label}</div>
          <div className='p-1'>{value}</div>
          <div className='p-1'>{unit}</div>
        </div>
      ))}
    </div>
  );
};
