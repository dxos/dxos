//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { truncateKey } from '@dxos/debug';
import { Panel } from '@dxos/devtools';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { type EncodedTrackName, type GlobalState } from '../calls';
import { meta } from '../meta';

export type CallDebugPanelProps = ThemedClassName<{
  state?: GlobalState;
}>;

export const CallDebugPanel = ({ state }: CallDebugPanelProps) => {
  const { t } = useTranslation(meta.id);
  const users = state?.call?.users;
  const self = state?.call?.self;

  const [open, setOpen] = useState(false);
  const handleToggle = () => setOpen(!open);

  const handleCopyRaw = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ users: state?.call?.users }, null, 2));
  };

  // const webrtcStats = useMemo(
  //   () =>
  //     new WebRTCStats({
  //       getStatsInterval: 1000,
  //     }),
  //   [],
  // );
  // const [stats, setStats] = useState<Record<string, any>>({});

  // useEffect(() => {
  //   const pc = state?.media.peer?.session?.peerConnection;
  //   const handleStats = (stats: Record<string, any>) => setStats(stats.data);
  //   let added = false;
  //   if (pc) {
  //     webrtcStats.addConnection({ pc, peerId: 1, connectionId: '1' });
  //     webrtcStats.on('stats', handleStats);
  //     added = true;
  //   }
  //   return () => {
  //     try {
  //       if (pc && added) {
  //         webrtcStats.removeConnection({ pc });
  //         webrtcStats.removeListener('stats', handleStats);
  //       }
  //     } catch (error) {
  //       log.error('error removing webrtc stats', { error, pc, peerId: 1, connectionId: '1' });
  //     }
  //   };
  // }, [state?.media.peer?.session?.peerConnection]);

  const rows = useMemo(() => getCallStatusTable(state), [state?.call.users, state?.media.pulledAudioTracks]);

  return (
    <Panel
      id='meeting-status'
      icon='ph--video-conference--regular'
      open={open}
      onToggle={handleToggle}
      title={t('meeting status title')}
      maxHeight={false}
    >
      <div className='flex flex-col w-full gap-2 text-xs'>
        {/* <div className='flex items-center gap-2'>
          <Input.Root>
            <Input.Label classNames={'text-sm'}>{t('show webrtc stats title')}</Input.Label>
            <Input.Checkbox checked={showDetailedWebRTCStats} onCheckedChange={handleShowDetailedWebRTCStats} />
          </Input.Root>   
          <IconButton icon='ph--copy--regular' label={'copy raw'} onClick={handleCopyRaw} />
        </div> */}
        <Table rows={rows} />
      </div>
    </Panel>
  );
};

const getCallStatusTable = (state?: GlobalState): TableProps['rows'] => {
  if (!state || !state.call?.users) {
    return [];
  }

  const self = state.call.self;
  const users = state.call.users.filter((user) => user.id !== self!.id);

  return [
    ['users', state.call.users.length ?? 0],
    [
      '*self* ' + (self?.name ?? truncateKey(self!.id, 8)),
      self?.tracks?.audio && state.media.pushedAudioTrack ? 'AUD ✅' : 'AUD ❌',
      self?.tracks?.video && state.media.pushedVideoTrack ? 'VID ✅' : 'VID ❌',
      self?.tracks?.screenshare && state.media.pushedScreenshareTrack ? 'SCR ✅' : 'SCR ❌',
    ],
    ...users.map((user) => [
      user.name ?? truncateKey(user.id, 8),
      user.tracks?.audio && state.media.pulledAudioTracks[user.tracks.audio as EncodedTrackName]?.ctx.disposed === false
        ? 'AUD ✅'
        : 'AUD ❌',
      user.tracks?.video &&
      state.media.pulledVideoStreams[user.tracks.video as EncodedTrackName]?.ctx.disposed === false
        ? 'VID ✅'
        : 'VID ❌',
      user.tracks?.screenshare &&
      state.media.pulledAudioTracks[user.tracks.screenshare as EncodedTrackName]?.ctx.disposed === false
        ? 'SCR ✅'
        : 'SCR ❌',
    ]),
  ];
};

export namespace Unit {
  export const KB = (n?: number) => ((n ?? 0) / 1_000).toFixed(2);
}

export type TableProps = {
  rows: (string | number)[][];
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
