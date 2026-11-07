//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Attention } from '@dxos/react-ui-attention/types';

import { type SpaceSchema } from '#types';

import { type PlankPosition, fromPlankPosition } from '../../util/pointer.ts';

/** A pointer to draw: whose it is, and where in which plank. */
export type ShownPointer = PlankPosition & {
  /** Stable per session, for React. */
  key: string;
  name: string;
  /** A palette hue such as `red`. */
  hue: string;
  plank: string;
  style: SpaceSchema.PointerStyle;
};

export type FollowOverlayProps = {
  pointers: readonly ShownPointer[];
};

type Placed = { key: string; left: number; top: number };

const hueColor = (hue: string) => `var(--color-${hue}-border)`;

// The same plank can be open twice (a companion, a stacked section); the one with a box is the one on screen.
const findPlankBox = (plank: string): DOMRect | undefined => {
  const selector = `[${Attention.ATTENDABLE_ATTRIBUTE}="${CSS.escape(plank)}"]`;
  for (const element of document.querySelectorAll(selector)) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      return box;
    }
  }
  return undefined;
};

/** Places each pointer on every frame, since the deck scrolls and resizes planks under an unchanged position. */
const usePlaced = (pointers: readonly ShownPointer[]): Placed[] => {
  const [placed, setPlaced] = useState<Placed[]>([]);
  useEffect(() => {
    if (pointers.length === 0) {
      setPlaced([]);
      return;
    }

    let frame = 0;
    let previous = '';
    const place = () => {
      const next = pointers.flatMap((pointer) => {
        const box = findPlankBox(pointer.plank);
        return box ? [{ key: pointer.key, ...fromPlankPosition(box, pointer) }] : [];
      });
      const serialized = JSON.stringify(next);
      if (serialized !== previous) {
        previous = serialized;
        setPlaced(next);
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [pointers]);
  return placed;
};

const Cursor = ({ color, name }: { color: string; name: string }) => (
  <>
    <svg width='18' height='18' viewBox='0 0 18 18' className='block'>
      <path d='M1 1 L1 15 L5 11 L8 17 L10.5 16 L7.5 10 L13 10 Z' fill={color} stroke='white' strokeWidth='1.25' />
    </svg>
    <span
      className='absolute left-4 top-4 px-1.5 py-0.5 rounded-sm text-xs text-white whitespace-nowrap'
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  </>
);

// The trail sits up and to the left, where a pointer moving down the page has just been.
const LASER_TRAIL = [
  { offset: 30, size: 5, opacity: 0.2 },
  { offset: 21, size: 7, opacity: 0.35 },
  { offset: 12, size: 9, opacity: 0.55 },
];

const Laser = ({ color, name }: { color: string; name: string }) => (
  <>
    {LASER_TRAIL.map(({ offset, size, opacity }) => (
      <span
        key={offset}
        className='absolute rounded-full'
        style={{
          left: -offset - size / 2,
          top: -offset * 0.66 - size / 2,
          width: size,
          height: size,
          opacity,
          backgroundColor: color,
        }}
      />
    ))}
    <span
      className='absolute -left-1.5 -top-1.5 size-3 rounded-full bg-white'
      style={{ boxShadow: `0 0 0 3px ${color}, 0 0 16px 6px ${color}` }}
    />
    <span
      className='absolute left-3 top-2 px-1 rounded-sm text-[10px] text-white whitespace-nowrap opacity-80'
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  </>
);

/** Draws, over the whole window and taking no input, the pointers of the sessions this one shares a follow with. */
export const FollowOverlay = ({ pointers }: FollowOverlayProps) => {
  const placed = usePlaced(pointers);
  const byKey = new Map(pointers.map((pointer) => [pointer.key, pointer]));

  return (
    <div className='fixed inset-0 z-50 pointer-events-none' data-testid='spacePlugin.followOverlay'>
      {placed.map(({ key, left, top }) => {
        const pointer = byKey.get(key);
        if (!pointer) {
          return null;
        }
        const color = hueColor(pointer.hue);
        return (
          <div
            key={key}
            className='absolute top-0 left-0'
            style={{ transform: `translate(${left}px, ${top}px)` }}
            data-testid='spacePlugin.followOverlay.pointer'
            data-name={pointer.name}
            data-plank={pointer.plank}
            data-style={pointer.style}
          >
            {pointer.style === 'laser' ? (
              <Laser color={color} name={pointer.name} />
            ) : (
              <Cursor color={color} name={pointer.name} />
            )}
          </div>
        );
      })}
    </div>
  );
};
