//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect } from 'react';

import { useAppGraph, useCapability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { useNode } from '@dxos/plugin-graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Toolbar, IconButton, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-sfx';

import { MeetingCapabilities } from '../../capabilities';
import { MEETING_PLUGIN } from '../../meta';
import { type MeetingType } from '../../types';
import { MediaButtons } from '../Media';

export type CallToolbarProps = {
  meeting?: MeetingType;
};

// TODO(mykola): Move transcription related logic to a separate component.
export const CallToolbar = ({ meeting }: CallToolbarProps) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const call = useCapability(MeetingCapabilities.CallManager);
  const { graph } = useAppGraph();
  const node = useNode(graph, meeting && fullyQualifiedId(meeting));
  const actions = node ? graph.actions(node).filter((action) => action.properties.disposition === 'toolbar') : [];
  const companions = node ? graph.nodes(node, { type: COMPANION_TYPE }) : [];

  useEffect(() => {
    const unsubscribeLeft = call.left.on((roomId) => {
      companions.forEach((companion) => {
        companion.properties.onLeave?.(roomId);
      });
    });

    const unsubscribeCallState = call.callStateUpdated.on((state) => {
      companions.forEach((companion) => {
        companion.properties.onCallStateUpdated?.(state);
      });
    });

    const unsubscribeMediaState = call.mediaStateUpdated.on((state) => {
      companions.forEach((companion) => {
        companion.properties.onMediaStateUpdated?.(state);
      });
    });

    return () => {
      unsubscribeLeft();
      unsubscribeCallState();
      unsubscribeMediaState();
    };
  }, [call, companions]);

  // Screen sharing.
  const isScreensharing = call.media.screenshareTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // TODO(wittjosiah): Leaving the call doesn't relinquish system audio/video.
  const leaveSound = useSoundEffect('LeaveCall');
  const handleLeave = useCallback(() => {
    void call.turnScreenshareOff();
    void call.leave();
    void leaveSound.play();
  }, [call, companions, leaveSound]);

  return (
    <Toolbar.Root>
      <IconButton variant='destructive' icon='ph--phone-x--regular' label={t('leave call')} onClick={handleLeave} />
      <div className='grow'></div>
      {/* TODO(wittjosiah): Use toolbar. In order to use toolbar, it needs to be updated to actually use the graph action callbacks directly. */}
      {actions.map((action) => (
        <IconButton
          key={action.id}
          iconOnly
          icon={action.properties.icon}
          label={toLocalizedString(action.properties.label, t)}
          classNames={action.properties.classNames}
          onClick={() => action.data({ node })}
        />
      ))}
      <IconButton
        disabled={!canSharescreen}
        iconOnly
        icon={isScreensharing ? 'ph--broadcast--regular' : 'ph--screencast--regular'}
        label={isScreensharing ? t('screenshare off') : t('screenshare on')}
        classNames={[isScreensharing && 'text-red-500']}
        onClick={
          isScreensharing
            ? () => call.turnScreenshareOff().catch((err) => log.catch(err))
            : () => call.turnScreenshareOn().catch((err) => log.catch(err))
        }
      />
      <IconButton
        iconOnly
        icon={call.raisedHand ? 'ph--hand-waving--regular' : 'ph--hand-palm--regular'}
        label={call.raisedHand ? t('lower hand') : t('raise hand')}
        classNames={[call.raisedHand && 'text-red-500']}
        onClick={() => call.setRaisedHand(!call.raisedHand)}
      />
      <MediaButtons />
    </Toolbar.Root>
  );
};

CallToolbar.displayName = 'CallToolbar';
