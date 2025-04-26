//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useAppGraph, useCapability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { useNode } from '@dxos/plugin-graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import {
  Toolbar as NativeToolbar,
  IconButton,
  useTranslation,
  toLocalizedString,
  type ThemedClassName,
  type IconButtonProps,
  Icon,
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { MeetingCapabilities } from '../../capabilities';
import { MEETING_PLUGIN } from '../../meta';
import { type MeetingType } from '../../types';

export type ToolbarProps = ThemedClassName<{
  meeting?: MeetingType;
  participants?: number;
  autoHideControls?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
}>;

// TODO(mykola): Move transcription related logic to a separate component.
export const Toolbar = ({
  classNames,
  meeting,
  participants,
  autoHideControls = true,
  onJoin,
  onLeave,
}: ToolbarProps) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const { graph } = useAppGraph();
  const call = useCapability(MeetingCapabilities.CallManager);

  // Meeting app graph node.
  const node = useNode(graph, meeting && fullyQualifiedId(meeting));
  const actions = node ? graph.actions(node).filter((action) => action.properties.disposition === 'toolbar') : [];

  // Screen sharing.
  const isScreensharing = call.media.screenshareTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // TODO(burdon): Create large toolbar/button sizes.
  // TODO(wittjosiah): Use toolbar. In order to use toolbar, it needs to be updated to actually use the graph action callbacks directly.
  return (
    <div
      className={mx(
        'flex justify-center p-4',
        call.joined && autoHideControls && 'opacity-0 transition-opacity duration-300 group-hover:opacity-100',
      )}
    >
      <NativeToolbar.Root classNames={['flex-inline !is-fit', classNames]}>
        {(call.joined && (
          <IconButton variant='destructive' icon='ph--phone-x--regular' label={t('leave call')} onClick={onLeave} />
        )) || (
          <IconButton variant='primary' icon='ph--phone-incoming--regular' label={t('join call')} onClick={onJoin} />
        )}

        {(participants !== undefined && (
          <div className='flex justify-center items-center is-[5rem] text-subdued text-xs gap-2'>
            <Icon icon='ph--users--regular' size={4} />
            <div>{participants}</div>
          </div>
        )) || <NativeToolbar.Separator variant='gap' />}

        {call.joined && (
          <>
            <ToggleButton
              active={call.raisedHand}
              state={{
                on: {
                  icon: 'ph--hand-waving--regular',
                  label: t('lower hand'),
                  onClick: () => call.setRaisedHand(false),
                },
                off: {
                  icon: 'ph--hand-palm--regular',
                  label: t('raise hand'),
                  onClick: () => call.setRaisedHand(true),
                },
              }}
            />

            {/* TODO(burdon): Companion actions. */}
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

            <ToggleButton
              disabled={!canSharescreen}
              active={isScreensharing}
              state={{
                on: {
                  icon: 'ph--monitor--regular',
                  label: t('screenshare off'),
                  onClick: () => call.turnScreenshareOff().catch((err) => log.catch(err)),
                },
                off: {
                  icon: 'ph--monitor-arrow-up--regular',
                  label: t('screenshare on'),
                  onClick: () => call.turnScreenshareOn().catch((err) => log.catch(err)),
                },
              }}
            />
          </>
        )}

        <ToggleButton
          active={call.media.audioEnabled}
          state={{
            on: {
              icon: 'ph--microphone--regular',
              label: t('mic off'),
              onClick: () => call.turnAudioOff(),
            },
            off: {
              icon: 'ph--microphone-slash--regular',
              label: t('mic on'),
              onClick: () => call.turnAudioOn(),
            },
          }}
        />
        <ToggleButton
          active={call.media.videoEnabled}
          state={{
            on: {
              icon: 'ph--video-camera--regular',
              label: t('camera off'),
              onClick: () => call.turnVideoOff(),
            },
            off: {
              icon: 'ph--video-camera-slash--regular',
              label: t('camera on'),
              onClick: () => call.turnVideoOn(),
            },
          }}
        />
      </NativeToolbar.Root>
    </div>
  );
};

Toolbar.displayName = 'MeetingToolbar';

type ToolbarButtonProps = Pick<IconButtonProps, 'disabled'> & {
  active?: boolean;
  state: {
    on: Pick<IconButtonProps, 'icon' | 'label' | 'onClick'>;
    off: Pick<IconButtonProps, 'icon' | 'label' | 'onClick'>;
  };
};

// TODO(burdon): Move to react-ui.
const ToggleButton = ({ active, state }: ToolbarButtonProps) => (
  <IconButton
    classNames={active && 'bg-callActive'}
    iconOnly
    size={5}
    icon={active ? state.on.icon : state.off.icon}
    label={active ? state.on.label : state.off.label}
    onClick={active ? state.on.onClick : state.off.onClick}
  />
);
