//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ComponentPropsWithoutRef } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Obj } from '@dxos/echo';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import {
  Button,
  Icon,
  type ThemedClassName,
  Toolbar as UiToolbar,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { type Channel } from '@dxos/types';
import { groupHoverControlItemWithTransition, mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { CallsCapabilities } from '#types';

export type ToolbarProps = ThemedClassName<{
  channel?: Channel.Channel;
  participants?: number;
  autoHideControls?: boolean;
  isInRoom?: boolean;
  onJoin?: () => void;
  /** Calls service unconfigured: the join control renders disabled rather than doing nothing. */
  joinDisabled?: boolean;
  onLeave?: () => void;
}>;

// TODO(wittjosiah): Use ToolbarMenu.
export const Toolbar = ({
  classNames,
  channel,
  participants,
  autoHideControls = true,
  isInRoom,
  onJoin,
  joinDisabled,
  onLeave,
}: ToolbarProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { graph } = ToolkitHooks.useAppGraph();
  const runAction = GraphHooks.useActionRunner();
  const call = Hooks.useCapability(CallsCapabilities.Manager);
  const audioEnabled = useAtomValue(call.audioEnabledAtom);
  const videoEnabled = useAtomValue(call.videoEnabledAtom);
  const isScreensharing = useAtomValue(call.screensharingAtom);
  const joined = useAtomValue(call.joinedAtom);
  const raisedHand = useAtomValue(call.raisedHandAtom);
  // Room-scoped membership, not the global session: when joined to a *different* room this toolbar
  // must still offer "join". Callers pass `isInRoom`; fall back to global joined when unset.
  const inRoom = isInRoom ?? joined;

  // Channel app graph node.
  const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));
  const actions = GraphHooks.useActions(graph, node?.id).filter(
    (action) => action.properties.disposition === 'toolbar',
  );

  // Screen sharing.
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // TODO(wittjosiah): In order to use toolbar, need to update to actually use the graph action callbacks directly.
  return (
    <div className={mx('z-20 flex justify-center m-8', autoHideControls && groupHoverControlItemWithTransition)}>
      <UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', classNames]}>
        <ToggleButton
          active={audioEnabled}
          state={{
            on: {
              icon: 'ph--microphone--regular',
              label: t('mic-off.button'),
              onClick: () => call.turnAudioOff(),
              classNames: 'bg-accent-bg',
            },
            off: {
              icon: 'ph--microphone-slash--duotone',
              label: t('mic-on.button'),
              onClick: () => call.turnAudioOn(),
            },
          }}
        />
        <ToggleButton
          active={videoEnabled}
          state={{
            on: {
              icon: 'ph--video-camera--regular',
              label: t('camera-off.button'),
              onClick: () => call.turnVideoOff(),
            },
            off: {
              icon: 'ph--video-camera-slash--duotone',
              label: t('camera-on.button'),
              onClick: () => call.turnVideoOn(),
            },
          }}
        />

        {(participants !== undefined && (
          <div className='flex justify-center items-center gap-2 w-[5rem] text-xs text-fg-subtle'>
            <Icon icon='ph--users--regular' />
            <div>{participants}</div>
          </div>
        )) || <UiToolbar.Separator variant='gap' />}

        {inRoom && (
          <>
            <ToggleButton
              disabled={!canSharescreen}
              active={isScreensharing}
              state={{
                on: {
                  icon: 'ph--monitor--regular',
                  label: t('screenshare-off.button'),
                  onClick: () => call.turnScreenshareOff(),
                },
                off: {
                  icon: 'ph--monitor-arrow-up--duotone',
                  label: t('screenshare-on.button'),
                  onClick: () => call.turnScreenshareOn(),
                },
              }}
            />

            {/* Companion actions. */}
            {actions
              .filter((action): action is AppGraphNode.Action => AppGraphNode.isAction(action))
              .map((action) => (
                <Button
                  key={action.id}
                  {...defaultButtonProps}
                  icon={action.properties.icon}
                  label={toLocalizedString(action.properties.label, t)}
                  classNames={action.properties.classNames}
                  onClick={() => node && void runAction(action, { parent: node })}
                />
              ))}

            <ToggleButton
              active={raisedHand}
              state={{
                on: {
                  icon: 'ph--hand-waving--regular',
                  label: t('lower-hand.button'),
                  onClick: () => call.setRaisedHand(false),
                },
                off: {
                  icon: 'ph--hand-palm--duotone',
                  label: t('raise-hand.button'),
                  onClick: () => call.setRaisedHand(true),
                },
              }}
            />
          </>
        )}
        {inRoom ? (
          <Button variant='destructive' icon='ph--phone-x--regular' label={t('leave-call.button')} onClick={onLeave} />
        ) : (
          <Button
            variant='primary'
            icon='ph--phone-incoming--regular'
            label={t('join-call.button')}
            disabled={joinDisabled}
            onClick={onJoin}
          />
        )}
      </UiToolbar.Root>
    </div>
  );
};

Toolbar.displayName = 'MeetingToolbar';

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

type ToggleButtonState = Pick<ButtonProps, 'icon' | 'label' | 'onClick'> & { classNames?: string };

type ToolbarButtonProps = Pick<ButtonProps, 'disabled'> & {
  active?: boolean;
  state: {
    on: ToggleButtonState;
    off: ToggleButtonState;
  };
};

const defaultButtonProps = {
  iconSize: 'lg',
  iconOnly: true,
} as const satisfies Partial<ButtonProps>;

const ToggleButton = ({ active, disabled, state }: ToolbarButtonProps) => (
  <Button
    {...defaultButtonProps}
    disabled={disabled}
    classNames={[active ? (state.on.classNames ?? 'bg-accent-bg') : state.off.classNames]}
    icon={active ? state.on.icon : state.off.icon}
    label={active ? state.on.label : state.off.label}
    onClick={active ? state.on.onClick : state.off.onClick}
  />
);
