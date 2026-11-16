//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';

import { SpaceNamespace } from '../../namespace.ts';

export type FollowControlsProps = {
  /** The follow cannot show the leader's view right now. */
  paused?: boolean;
  onStop: () => void;
  /** Stop closes the popover it sits in, as the row's other actions do. */
  closePopover?: boolean;
};

/** The follower's controls on the row of the person it follows, in place of that person's actions. */
export const FollowControls = ({ paused, onStop, closePopover }: FollowControlsProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const stop = (
    <Button.Root
      variant='outline'
      icon='ph--stop--regular'
      label={t('presence-stop-following.label')}
      data-testid='spacePlugin.presence.stopFollowing'
      onClick={onStop}
    />
  );
  return (
    <>
      {paused && <span className='text-sm text-fg-subtle'>{t('presence-follow-paused.label')}</span>}
      {closePopover ? <Popover.CloseTrigger asChild>{stop}</Popover.CloseTrigger> : stop}
    </>
  );
};
