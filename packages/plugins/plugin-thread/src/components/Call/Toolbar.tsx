//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useAppGraph, useCapability } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { useActions, useNode } from '@dxos/plugin-graph';
import {
  Icon,
  IconButton,
  type IconButtonProps,
  Toolbar as NaturalToolbar,
  type ThemedClassName,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { groupHoverControlItemWithTransition, mx } from '@dxos/ui-theme';

import { ThreadCapabilities } from '../../capabilities';
import { meta } from '../../meta';
import { type Channel } from '../../types';

export type ToolbarProps = ThemedClassName<{
  channel?: Channel.Channel;
  participants?: number;
  autoHideControls?: boolean;
  isInRoom?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
}>;

// TODO(wittjosiah): Use ToolbarMenu.
export const Toolbar = ({
  classNames,
  channel,
  participants,
  autoHideControls = true,
  onJoin,
  onLeave,
}: ToolbarProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const call = useCapability(ThreadCapabilities.CallManager);

  // Channel app graph node.
  const node = useNode(graph, channel && Obj.getDXN(channel).toString());
  const actions = useActions(graph, node?.id).filter((action) => action.properties.disposition === 'toolbar');

  // Screen sharing.
  const isScreensharing = call.media.screenshareTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // TODO(wittjosiah): In order to use toolbar, need to update to actually use the graph action callbacks directly.
  return (
    <div className={mx('z-20 flex justify-center m-8', autoHideControls && groupHoverControlItemWithTransition)}>
      <NaturalToolbar.Root classNames={['p-2 bg-modalSurface rounded-md shadow-md', classNames]}>
        <ToggleButton
          active={call.media.audioEnabled}
          state={{
            on: {
              icon: 'ph--microphone--regular',
              label: t('mic off'),
              onClick: () => call.turnAudioOff(),
              classNames: 'bg-callActive',
            },
            off: {
              icon: 'ph--microphone-slash--duotone',
              label: t('mic on'),
              onClick: () => call.turnAudioOn(),
              classNames: [call.joined && 'bg-callAlert'],
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
              icon: 'ph--video-camera-slash--duotone',
              label: t('camera on'),
              onClick: () => call.turnVideoOn(),
            },
          }}
        />

        {(participants !== undefined && (
          <div className='flex justify-center items-center gap-2 is-[5rem] text-xs text-subdued'>
            <Icon icon='ph--users--regular' size={4} />
            <div>{participants}</div>
          </div>
        )) || <NaturalToolbar.Separator variant='gap' />}

        {call.joined && (
          <>
            <ToggleButton
              disabled={!canSharescreen}
              active={isScreensharing}
              state={{
                on: {
                  icon: 'ph--monitor--regular',
                  label: t('screenshare off'),
                  onClick: () => call.turnScreenshareOff(),
                },
                off: {
                  icon: 'ph--monitor-arrow-up--duotone',
                  label: t('screenshare on'),
                  onClick: () => call.turnScreenshareOn(),
                },
              }}
            />

            {/* Companion actions. */}
            {actions.map((action) => (
              <IconButton
                key={action.id}
                {...defaultButtonProps}
                icon={action.properties.icon}
                label={toLocalizedString(action.properties.label, t)}
                classNames={action.properties.classNames}
                onClick={() => action.data({ node })}
              />
            ))}

            <ToggleButton
              active={call.raisedHand}
              state={{
                on: {
                  icon: 'ph--hand-waving--regular',
                  label: t('lower hand'),
                  onClick: () => call.setRaisedHand(false),
                  classNames: [call.joined && 'bg-callAlert'],
                },
                off: {
                  icon: 'ph--hand-palm--duotone',
                  label: t('raise hand'),
                  onClick: () => call.setRaisedHand(true),
                },
              }}
            />
          </>
        )}
        {call.joined ? (
          <IconButton variant='destructive' icon='ph--phone-x--regular' label={t('leave call')} onClick={onLeave} />
        ) : (
          <IconButton variant='primary' icon='ph--phone-incoming--regular' label={t('join call')} onClick={onJoin} />
        )}
      </NaturalToolbar.Root>
    </div>
  );
};

Toolbar.displayName = 'MeetingToolbar';

type ToolbarButtonProps = Pick<IconButtonProps, 'disabled'> & {
  active?: boolean;
  state: {
    on: Pick<IconButtonProps, 'icon' | 'label' | 'onClick' | 'classNames'>;
    off: Pick<IconButtonProps, 'icon' | 'label' | 'onClick' | 'classNames'>;
  };
};

const defaultButtonProps: Partial<IconButtonProps> = {
  size: 5,
  iconOnly: true,
};

const ToggleButton = ({ active, state }: ToolbarButtonProps) => (
  <IconButton
    {...defaultButtonProps}
    classNames={[active ? (state.on.classNames ?? 'bg-callActive') : state.off.classNames]}
    icon={active ? state.on.icon : state.off.icon}
    label={active ? state.on.label : state.off.label}
    onClick={active ? state.on.onClick : state.off.onClick}
  />
);
