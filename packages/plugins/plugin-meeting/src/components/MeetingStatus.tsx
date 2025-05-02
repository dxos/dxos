//
// Copyright 2024 DXOS.org
//

import { WebRTCStats } from '@peermetrics/webrtc-stats';
import React, { useEffect, useMemo, useState } from 'react';

import { Panel } from '@dxos/devtools';
import { log } from '@dxos/log';
import { Input, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';

import { MEETING_PLUGIN } from '../meta';
import { type GlobalState } from '../state';

export type MeetingStatusDetailProps = ThemedClassName<{
  state?: GlobalState;
}>;

// TODO(wittjosiah): This currently does not show `differentDocuments` at all.
export const MeetingStatusDetail = ({ state }: MeetingStatusDetailProps) => {
  const users = state?.call?.users;
  const self = state?.call?.self;
  const { t } = useTranslation(MEETING_PLUGIN);

  const [open, setOpen] = useState(false);
  const handleToggle = () => setOpen(!open);
  const [showDetailedWebRTCStats, setShowDetailedWebRTCStats] = useState(false);
  const handleShowDetailedWebRTCStats = () => setShowDetailedWebRTCStats(!showDetailedWebRTCStats);

  const webrtcStats = useMemo(
    () =>
      new WebRTCStats({
        getStatsInterval: 1000,
      }),
    [],
  );

  const [stats, setStats] = useState<Record<string, any>>({});
  useEffect(() => {
    const pc = state?.media.peer?.session?.peerConnection;
    const handleStats = (stats: Record<string, any>) => setStats(stats.data);
    let added = false;
    if (pc && showDetailedWebRTCStats) {
      webrtcStats.addConnection({ pc, peerId: 1, connectionId: '1' });
      webrtcStats.on('stats', handleStats);
      added = true;
    }
    return () => {
      try {
        if (pc && added) {
          webrtcStats.removeConnection({ pc });
          webrtcStats.removeListener('stats', handleStats);
        }
      } catch (error) {
        log.error('error removing webrtc stats', { error, pc, peerId: 1, connectionId: '1' });
      }
    };
  }, [state?.media.peer?.session?.peerConnection, showDetailedWebRTCStats]);

  return (
    <Panel
      id='meeting-status'
      icon='ph--video-conference--regular'
      open={open}
      onToggle={handleToggle}
      title={t('meeting status title')}
      maxHeight={false}
      info={
        <div className='flex items-center gap-2'>
          <span title='Joined'>{self?.joined ? 'On' : 'Off'}</span>
          <span title='Users'>{users?.length ?? 0} User(s)</span>
        </div>
      }
    >
      <div className='flex flex-col gap-2 overflow-y-auto'>
        <div className='flex items-row gap-2'>
          <Input.Root>
            <Input.Label classNames={'text-sm'}>{t('show webrtc stats title')}</Input.Label>
            <Input.Checkbox checked={showDetailedWebRTCStats} onCheckedChange={handleShowDetailedWebRTCStats} />
          </Input.Root>
        </div>
        <Json
          classNames='text-sm'
          data={{
            users,
            activities: state?.call?.activities,
            ...(showDetailedWebRTCStats
              ? {
                  webrtc: {
                    connectionState: state?.media.peer?.session?.peerConnection.connectionState,
                    iceConnectionState: state?.media.peer?.session?.peerConnection.iceConnectionState,
                    stats,
                  },
                }
              : {}),
            tracks: state?.media.peer?.session?.peerConnection.getTransceivers().map((transceiver) => {
              const track =
                transceiver.direction === 'recvonly' ? transceiver.receiver.track : transceiver.sender.track;
              return {
                id: track?.id,
                kind: track?.kind,
                direction: transceiver.direction,
                enabled: track?.enabled,
                muted: track?.muted,
                readyState: track?.readyState,
                settings: track?.getSettings(),
              };
            }),
            callsServiceHistory: state?.media.peer?.history.get(),
          }}
        />
      </div>
    </Panel>
  );
};
export default MeetingStatusDetail;
