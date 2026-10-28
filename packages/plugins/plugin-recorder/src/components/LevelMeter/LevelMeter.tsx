//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { CLIP_DB, FLOOR_DB, TARGET_DB, toFraction } from '../../audio/level.ts';

export type LevelMeterProps = {
  /** Peak of the latest block (dBFS); undefined while no input is open. */
  peakDb?: number;
  /** Held recent peak (dBFS). */
  holdDb?: number;
  rmsDb?: number;
  /** No signal for a while: the mic is muted or dead. */
  silent?: boolean;
  clip?: boolean;
  /** Shows only the bar, and a readout only to warn (NO SIGNAL, CLIP). */
  compact?: boolean;
};

const WARNING = 'rounded-sm bg-error-bg px-1.5 py-0.5 font-semibold text-error-fg';

const percent = (db: number) => `${toFraction(db) * 100}%`;

/**
 * A peak meter over -60..0 dBFS: green to the target band, amber within it (where speech peaks should sit), red above
 * it; a marker holds the recent peak, and the readout warns of clipping and of a silent input.
 */
export const LevelMeter = ({ peakDb, holdDb, rmsDb, silent, clip, compact }: LevelMeterProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const level = peakDb ?? FLOOR_DB;
  const clipping = !!clip || (holdDb ?? level) > CLIP_DB;

  return (
    <div className='flex items-center gap-2' data-testid='recorder.level-meter'>
      <div
        role='meter'
        aria-label={t('level-meter.label')}
        aria-valuemin={FLOOR_DB}
        aria-valuemax={0}
        aria-valuenow={Math.round(level)}
        className='relative h-3 w-40 shrink-0 overflow-hidden rounded-sm bg-input-surface'
      >
        <div
          className='absolute inset-y-0 start-0 transition-[width] duration-75'
          style={{
            width: percent(level),
            background: `linear-gradient(90deg, var(--color-success-text) 0 ${percent(TARGET_DB.min)}, var(--color-warning-text) ${percent(TARGET_DB.min)} ${percent(TARGET_DB.max)}, var(--color-error-text) ${percent(TARGET_DB.max)})`,
            backgroundSize: '10rem 100%',
          }}
        />
        {/* The target band's edges. */}
        <div className='absolute inset-y-0 w-px bg-separator' style={{ left: percent(TARGET_DB.min) }} />
        <div className='absolute inset-y-0 w-px bg-separator' style={{ left: percent(TARGET_DB.max) }} />
        {holdDb !== undefined && <div className='absolute inset-y-0 w-0.5 bg-fg' style={{ left: percent(holdDb) }} />}
      </div>
      {compact ? (
        (silent || clipping) && (
          <span data-testid='recorder.level-meter.readout' className={mx(WARNING, 'text-xs')}>
            {t(silent ? 'no-signal.label' : 'clip.label')}
          </span>
        )
      ) : (
        <span
          data-testid='recorder.level-meter.readout'
          className={mx('min-w-[12rem] font-mono text-xs', silent ? WARNING : 'text-fg-muted')}
        >
          {silent
            ? t('no-signal.label')
            : peakDb === undefined
              ? t('no-input.label')
              : t('level.label', { peak: Math.round(holdDb ?? level), rms: Math.round(rmsDb ?? FLOOR_DB) }) +
                (clipping ? ` · ${t('clip.label')}` : '')}
        </span>
      )}
    </div>
  );
};

LevelMeter.displayName = 'LevelMeter';
