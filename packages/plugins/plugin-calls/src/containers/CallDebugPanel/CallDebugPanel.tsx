//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { truncateKey } from '@dxos/debug';
import { Panel } from '@dxos/devtools';
import { IconButton, Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type EncodedTrackName, type GlobalState, type MediaStats } from '../../calls';

export type CallDebugPanelProps = ThemedClassName<{ state?: GlobalState }>;

export const CallDebugPanel = ({ state }: CallDebugPanelProps) => {
  const { t } = useTranslation(meta.profile.key);

  const [open, setOpen] = useState(false);
  const handleToggle = () => setOpen(!open);

  const handleCopyRaw = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ users: state?.call?.users }, null, 2));
  };

  const rows = useMemo(() => getCallStatusTable(state), [state?.call.users, state?.media.pulledAudioTracks]);

  // Poll the transport's WebRTC send-side stats (~1s) only while the toggle is on and a session is live.
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<MediaStats>();
  const peer = state?.media.peer;
  useEffect(() => {
    if (!showStats || !peer?.getStats) {
      setStats(undefined);
      return;
    }
    let active = true;
    const poll = () => {
      peer.getStats!().then(
        (next) => active && setStats(next),
        () => {},
      );
    };
    poll();
    const interval = setInterval(poll, 1_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showStats, peer]);

  return (
    <Panel
      id='meeting-status'
      icon='ph--video-conference--regular'
      open={open}
      onToggle={handleToggle}
      title={t('meeting-status.title')}
      info={<div className='flex items-center gap-2'> {state?.call.joined ? 'Active' : 'Inactive'}</div>}
      maxHeight={0}
    >
      <div className='flex flex-col w-full text-xs'>
        <div className='flex items-center gap-2 items-center'>
          <IconButton icon='ph--copy--regular' label={'copy raw'} onClick={handleCopyRaw} />
          <Input.Root>
            <Input.Switch checked={showStats} onCheckedChange={setShowStats} />
            <Input.Label>{t('show-webrtc-stats.label')}</Input.Label>
          </Input.Root>
        </div>
        <Table rows={rows} />
        {showStats && (
          <pre className='mt-2 max-h-64 overflow-auto whitespace-pre-wrap'>{JSON.stringify(stats ?? {}, null, 2)}</pre>
        )}
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
      // A track is "ok" when it is present in the pulled cache: the event-driven sync only caches live remote
      // tracks and drops them when the peer leaves, so presence alone means it is currently playable.
      const isOk = {
        audio: user.tracks?.audio && !!state.media.pulledAudioTracks[user.tracks?.audio as EncodedTrackName],
        video: user.tracks?.video && !!state.media.pulledVideoStreams[user.tracks?.video as EncodedTrackName],
        screenshare:
          user.tracks?.screenshare && !!state.media.pulledVideoStreams[user.tracks?.screenshare as EncodedTrackName],
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
    <div className='w-full text-xs font-mono'>
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
