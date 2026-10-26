//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/** `m:ss`. */
export const formatSeconds = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** Over the desired length, compared as shown (whole seconds), so a row never reads 0:20 / 0:20 and flagged. */
export const isOver = (seconds: number | undefined, desired: number | undefined): boolean =>
  seconds !== undefined && desired !== undefined && Math.round(seconds) > Math.round(desired);

export type TakeItem = {
  id: string;
  name: string;
  /** Length of the take, in seconds. */
  duration: number;
  /** The slide's desired length, in seconds. */
  desired?: number;
  /** The slide's main take. */
  main?: boolean;
  /** The take recorded a picture besides the voice. */
  video?: boolean;
  /** The inline player, while the take plays. */
  player?: ReactNode;
  /** Why the take is not saved yet. */
  error?: string;
};

export type TakeListRootProps = PropsWithChildren;

/** A slide's takes, newest first. */
const TakeListRoot = ({ children }: TakeListRootProps) => (
  <ul className='flex flex-col gap-2' data-testid='recorder.takes'>
    {children}
  </ul>
);

TakeListRoot.displayName = 'TakeList.Root';

export type TakeListItemProps = { take: TakeItem; actions?: ReactNode };

/** One take: its name, length against the slide's desired length (flagged when over), main mark and actions. */
const TakeListItem = ({ take, actions }: TakeListItemProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const over = isOver(take.duration, take.desired);
  return (
    <li
      className={mx('flex flex-col gap-2 rounded-md border p-2', take.main ? 'border-accent-text' : 'border-separator')}
      data-testid='recorder.take'
      data-main={take.main}
    >
      <div className='flex items-center gap-2'>
        <Icon.Icon icon={take.video ? 'ph--video-camera--regular' : 'ph--microphone--regular'} size='sm' />
        <span className='grow truncate font-medium'>{take.name}</span>
        {take.main && <span className='text-xs text-accent-text'>{t('main-take.label')}</span>}
        <span className={mx('font-mono text-sm', over ? 'text-error-text' : 'text-fg-muted')}>
          {formatSeconds(take.duration)}
          {take.desired !== undefined && ` / ${formatSeconds(take.desired)}`}
        </span>
        {actions}
      </div>
      {take.error && <p className='text-sm text-error-text'>{take.error}</p>}
      {take.player}
    </li>
  );
};

TakeListItem.displayName = 'TakeList.Item';

export const TakeList = {
  Root: TakeListRoot,
  Item: TakeListItem,
};
