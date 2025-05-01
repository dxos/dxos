//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Panel } from '@dxos/devtools';
import { useTranslation, type ThemedClassName } from '@dxos/react-ui';
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
      <Json
        classNames='text-sm'
        data={{
          users,
          tracks: state?.media.peer?.session?.peerConnection.getTransceivers().map(({ receiver }) => ({
            id: receiver.track?.id,
            kind: receiver.track?.kind,
            enabled: receiver.track?.enabled,
            muted: receiver.track?.muted,
            readyState: receiver.track?.readyState,
            settings: receiver.track?.getSettings(),
          })),
          callsServiceHistory: state?.media.peer?.history.get(),
        }}
      />
    </Panel>
  );
};

export default MeetingStatusDetail;
