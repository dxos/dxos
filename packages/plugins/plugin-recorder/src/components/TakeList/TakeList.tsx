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

/** A slide's time in a take, against the length the deck wants for it. */
export type TakeSlide = {
  id: string;
  title: string;
  /** Seconds the take spent on the slide (all visits). */
  seconds?: number;
  /** Desired length, in seconds. */
  duration?: number;
};

export type TakeItem = {
  id: string;
  name: string;
  /** Length of the take, in seconds. */
  duration: number;
  /** The artifact's chosen take. */
  cover?: boolean;
  /** What the take recorded besides the voice. */
  video?: boolean;
  slides: TakeSlide[];
  /** The player for the take (a studio variant renderer). */
  player?: ReactNode;
  /** Why the take is not saved yet. */
  error?: string;
};

export type TakeListRootProps = PropsWithChildren;

/** A presentation's takes, newest first. */
const TakeListRoot = ({ children }: TakeListRootProps) => (
  <ul className='flex flex-col gap-4' data-testid='recorder.takes'>
    {children}
  </ul>
);

TakeListRoot.displayName = 'TakeList.Root';

export type TakeListItemProps = { take: TakeItem; actions?: ReactNode };

/**
 * One take: its player, and each slide's recorded length against its desired length, flagged when the take ran over.
 */
const TakeListItem = ({ take, actions }: TakeListItemProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <li className='flex flex-col gap-2 rounded-md border border-separator p-3' data-testid='recorder.take'>
      <div className='flex items-center gap-2'>
        <Icon.Icon icon={take.video ? 'ph--video-camera--regular' : 'ph--microphone--regular'} size='sm' />
        <span className='grow truncate font-medium'>{take.name}</span>
        {take.cover && <span className='text-xs text-fg-subtle'>{t('cover-take.label')}</span>}
        <span className='font-mono text-sm text-fg-muted'>{formatSeconds(take.duration)}</span>
        {actions}
      </div>
      {take.error && <p className='text-sm text-error-text'>{take.error}</p>}
      {take.player}
      {take.slides.length > 0 && (
        <table className='w-full text-sm'>
          <thead className='text-fg-subtle'>
            <tr>
              <th className='text-start font-normal'>{t('slide-column.label')}</th>
              <th className='w-16 text-end font-normal'>{t('recorded-column.label')}</th>
              <th className='w-16 text-end font-normal'>{t('desired-column.label')}</th>
            </tr>
          </thead>
          <tbody>
            {take.slides.map((slide) => {
              // Compared as shown (whole seconds), so a row never reads 0:20 / 0:20 and flagged.
              const over =
                slide.seconds !== undefined &&
                slide.duration !== undefined &&
                Math.round(slide.seconds) > Math.round(slide.duration);
              return (
                <tr key={slide.id} data-over={over}>
                  <td className='truncate'>{slide.title}</td>
                  <td className={mx('text-end font-mono', over && 'text-error-text')}>
                    {slide.seconds === undefined ? '—' : formatSeconds(slide.seconds)}
                  </td>
                  <td className='text-end font-mono text-fg-muted'>
                    {slide.duration === undefined ? '—' : formatSeconds(slide.duration)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </li>
  );
};

TakeListItem.displayName = 'TakeList.Item';

export const TakeList = {
  Root: TakeListRoot,
  Item: TakeListItem,
};
