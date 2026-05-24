//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent as ReactKeyboardEvent, forwardRef, useCallback, useRef } from 'react';

import { mx } from '@dxos/ui-theme';

import {
  type DateSegmentOrder,
  type SegmentKind,
  type SegmentValues,
  type TimeSegmentOrder,
  incrementSegment,
} from './segments';

const SEGMENT_PLACEHOLDER: Record<SegmentKind, string> = {
  yyyy: 'yyyy',
  MM: 'mm',
  dd: 'dd',
  HH: 'hh',
  hh: 'hh',
  mm: 'mm',
  a: 'AM',
};

const SEGMENT_WIDTH_CH: Record<SegmentKind, number> = {
  yyyy: 4,
  MM: 2,
  dd: 2,
  HH: 2,
  hh: 2,
  mm: 2,
  a: 2,
};

const SEGMENT_NUMERIC_MAX_LEN: Record<SegmentKind, number> = {
  yyyy: 4,
  MM: 2,
  dd: 2,
  HH: 2,
  hh: 2,
  mm: 2,
  a: 2,
};

const SEGMENT_ARIA_LABEL: Record<SegmentKind, string> = {
  yyyy: 'Year',
  MM: 'Month',
  dd: 'Day',
  HH: 'Hour (24-hour)',
  hh: 'Hour (12-hour)',
  mm: 'Minute',
  a: 'AM/PM',
};

export type SegmentedInputProps = {
  dateOrder?: DateSegmentOrder;
  timeOrder?: TimeSegmentOrder;
  values: SegmentValues;
  onChange: (values: SegmentValues) => void;
  disabled?: boolean;
  classNames?: string;
};

const isNumericSegment = (kind: SegmentKind): boolean => kind !== 'a';

/**
 * A row of editable date/time segments. Driven entirely by the `values` prop;
 * keyboard handlers transform values and call `onChange`. Focus is internal.
 */
export const SegmentedInput = forwardRef<HTMLDivElement, SegmentedInputProps>(
  ({ dateOrder, timeOrder, values, onChange, disabled = false, classNames }, forwardedRef) => {
    const segments: SegmentKind[] = [...((dateOrder ?? []) as SegmentKind[]), ...((timeOrder ?? []) as SegmentKind[])];
    const segmentRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const focusSegment = useCallback((kind: SegmentKind) => {
      segmentRefs.current[kind]?.focus();
      segmentRefs.current[kind]?.select();
    }, []);

    const focusOffset = useCallback(
      (current: SegmentKind, delta: number) => {
        const i = segments.indexOf(current);
        const next = segments[i + delta];
        if (next) {
          focusSegment(next);
        }
      },
      [segments, focusSegment],
    );

    const handleKeyDown = useCallback(
      (kind: SegmentKind) => (ev: ReactKeyboardEvent<HTMLInputElement>) => {
        if (disabled) {
          return;
        }
        const current = values[kind] ?? '';

        if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          const seed = current === '' ? defaultSeed(kind) : current;
          onChange({ ...values, [kind]: incrementSegment(kind, seed, 1) });
          return;
        }
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          const seed = current === '' ? defaultSeed(kind) : current;
          onChange({ ...values, [kind]: incrementSegment(kind, seed, -1) });
          return;
        }
        if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          focusOffset(kind, 1);
          return;
        }
        if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          focusOffset(kind, -1);
          return;
        }
        if (ev.key === 'Backspace') {
          ev.preventDefault();
          onChange({ ...values, [kind]: '' });
          return;
        }

        // AM/PM segment: typing 'a' or 'p' jumps.
        if (kind === 'a') {
          if (ev.key.toLowerCase() === 'a') {
            ev.preventDefault();
            onChange({ ...values, a: 'AM' });
            focusOffset(kind, 1);
          } else if (ev.key.toLowerCase() === 'p') {
            ev.preventDefault();
            onChange({ ...values, a: 'PM' });
            focusOffset(kind, 1);
          }
          return;
        }

        // Numeric segments: accumulate digits up to max length; auto-advance when filled.
        if (/^[0-9]$/.test(ev.key)) {
          ev.preventDefault();
          const maxLen = SEGMENT_NUMERIC_MAX_LEN[kind];
          const next = (current + ev.key).slice(-maxLen);
          onChange({ ...values, [kind]: next });
          if (next.length >= maxLen) {
            focusOffset(kind, 1);
          }
        }
      },
      [disabled, values, onChange, focusOffset],
    );

    return (
      <div
        ref={forwardedRef}
        role='group'
        className={mx(
          'inline-flex items-center gap-0.5 px-2 py-1 rounded border border-input-stroke bg-input-surface',
          disabled && 'opacity-50',
          classNames,
        )}
      >
        {segments.map((kind, i) => {
          const value = values[kind] ?? '';
          const placeholder = SEGMENT_PLACEHOLDER[kind];
          return (
            <React.Fragment key={kind}>
              {i > 0 && <span className='text-description'>{separatorBetween(segments[i - 1], kind)}</span>}
              <input
                ref={(node) => {
                  segmentRefs.current[kind] = node;
                }}
                aria-label={SEGMENT_ARIA_LABEL[kind]}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                readOnly
                onKeyDown={handleKeyDown(kind)}
                onFocus={(ev) => ev.currentTarget.select()}
                inputMode={isNumericSegment(kind) ? 'numeric' : 'text'}
                className='text-center bg-transparent outline-none caret-transparent'
                style={{ width: `${SEGMENT_WIDTH_CH[kind]}ch` }}
                data-segment={kind}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);

SegmentedInput.displayName = 'SegmentedInput';

/** Initial seed when incrementing an empty segment (so ArrowUp on empty yyyy yields current year, etc.). */
const defaultSeed = (kind: SegmentKind): string => {
  const now = new Date();
  switch (kind) {
    case 'yyyy':
      return String(now.getFullYear());
    case 'MM':
      return String(now.getMonth() + 1).padStart(2, '0');
    case 'dd':
      return String(now.getDate()).padStart(2, '0');
    case 'HH':
      return '00';
    case 'hh':
      return '12';
    case 'mm':
      return '00';
    case 'a':
      return 'AM';
  }
};

const isDateSegment = (kind: SegmentKind): boolean => kind === 'yyyy' || kind === 'MM' || kind === 'dd';
const isTimeSegment = (kind: SegmentKind): boolean => kind === 'HH' || kind === 'hh' || kind === 'mm' || kind === 'a';

/** Separator character drawn between two adjacent segments. */
const separatorBetween = (prev: SegmentKind, next: SegmentKind): string => {
  // Date → time boundary (e.g. yyyy → hh in 'date-time' modes) uses a space.
  if (isDateSegment(prev) && isTimeSegment(next)) {
    return ' ';
  }
  if (next === 'mm' && (prev === 'HH' || prev === 'hh')) {
    return ':';
  }
  if (next === 'a') {
    return ' ';
  }
  if (prev === 'mm' || prev === 'HH' || prev === 'hh') {
    return ' ';
  }
  return '/';
};
