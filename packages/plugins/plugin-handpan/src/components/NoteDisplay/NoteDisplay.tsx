//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type NoteDisplayProps = {
  /** Handpan notation label (`D`, `1`…); omitted when nothing is detected. */
  label?: string;
  pitch?: string;
  frequency?: number;
  /** Offset from the matched note, in cents. */
  cents?: number;
  /** Pitch clarity, 0–1. */
  clarity?: number;
  percussive?: boolean;
  classNames?: string;
};

/** Large readout of the current note with a ±50 cent tuning meter. */
export const NoteDisplay = ({ label, pitch, frequency, cents, clarity, percussive, classNames }: NoteDisplayProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const offset = Math.max(-50, Math.min(50, cents ?? 0));
  const inTune = cents !== undefined && Math.abs(cents) <= 10;
  // `|| 0` folds -0, which would otherwise render as "-0¢".
  const rounded = cents !== undefined ? Math.round(cents) || 0 : undefined;

  return (
    <Layout.Flex column align='center' gap='sm' classNames={classNames} data-testid='handpan.note-display'>
      <Layout.Flex align='end' gap='md'>
        <span className='text-6xl font-semibold tabular-nums' data-testid='handpan.note-display.label'>
          {percussive ? t('percussive.label') : (label ?? '–')}
        </span>
        <span className='text-2xl text-fg-muted pb-1'>{percussive ? '' : (pitch ?? '')}</span>
      </Layout.Flex>
      <svg viewBox='0 0 200 24' className='w-64' role='meter' aria-label={t('cents.label')} aria-valuenow={cents}>
        <line x1={0} y1={12} x2={200} y2={12} strokeWidth={2} className='stroke-separator' />
        {[-50, -25, 0, 25, 50].map((tick) => (
          <line
            key={tick}
            x1={100 + tick * 2}
            x2={100 + tick * 2}
            y1={tick === 0 ? 2 : 7}
            y2={tick === 0 ? 22 : 17}
            strokeWidth={1}
            className='stroke-fg-subtle'
          />
        ))}
        {cents !== undefined && (
          <circle
            cx={100 + offset * 2}
            cy={12}
            r={6}
            className={mx('transition-[cx] duration-100', inTune ? 'fill-accent-bg' : 'fill-fg-muted')}
          />
        )}
      </svg>
      <span className='text-sm text-fg-subtle tabular-nums'>
        {frequency !== undefined ? `${frequency.toFixed(1)} Hz` : ' '}
        {rounded !== undefined ? ` · ${rounded > 0 ? '+' : ''}${rounded}¢` : ''}
        {clarity !== undefined ? ` · ${t('clarity.label')} ${(clarity * 100).toFixed(0)}%` : ''}
      </span>
    </Layout.Flex>
  );
};
