//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { log } from '@dxos/log';
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
  log.info('users', { users, self });
  const { t } = useTranslation(MEETING_PLUGIN);

  return (
    <div className={'flex flex-col gap-3 p-2 text-xs min-w-[400px] overflow-auto'}>
      <h1 className='flex-1'>{t('meeting status title')}</h1>
      <div role='none' className='flex items-center'>
        <Json
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
            callsServiceHistory: state?.media.peer?.negotiationHistory.get(),
          }}
        />
      </div>
    </div>
  );
};

export default MeetingStatusDetail;
