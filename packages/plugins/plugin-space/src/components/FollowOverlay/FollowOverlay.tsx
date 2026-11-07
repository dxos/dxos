//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Attention } from '@dxos/react-ui-attention/types';

import { type SpaceSchema } from '#types';

import { type Box, type PlankPosition, fromPlankPosition } from '../../util/pointer.ts';

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

type Point = { left: number; top: number };

type Placed = Point & { key: string; trail: (Point & { age: number })[] };

const hueColor = (hue: string) => `var(--color-${hue}-border)`;

// The same plank can be open twice (a companion, a stacked section); the one with a box is the one on screen.
const findPlankBox = (plank: string): Box | undefined => {
  const selector = `[${Attention.ATTENDABLE_ATTRIBUTE}="${CSS.escape(plank)}"]`;
  for (const element of document.querySelectorAll(selector)) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      return box;
    }
  }
  return undefined;
};

/** How long a laser's tail lasts behind it. */
const TRAIL_MS = 450;

/** Share of the remaining distance a pointer covers each frame, so steps between posts read as motion. */
const EASE = 0.35;

/**
 * Places each pointer on every frame, since the deck scrolls and resizes planks under an unchanged position. Each eases
 * toward where it was last reported, and a laser keeps the path it eased along as its tail.
 */
const usePlaced = (pointers: readonly ShownPointer[]): Placed[] => {
  const [placed, setPlaced] = useState<Placed[]>([]);
  const shown = useRef(new Map<string, Point>());
  const trails = useRef(new Map<string, (Point & { at: number })[]>());
  useEffect(() => {
    if (pointers.length === 0) {
      shown.current.clear();
      trails.current.clear();
      setPlaced([]);
      return;
    }

    let frame = 0;
    let previous = '';
    const place = () => {
      const now = performance.now();
      const next = pointers.flatMap((pointer): Placed[] => {
        const box = findPlankBox(pointer.plank);
        if (!box) {
          shown.current.delete(pointer.key);
          trails.current.delete(pointer.key);
          return [];
        }
        const target = fromPlankPosition(box, pointer);
        const last = shown.current.get(pointer.key);
        const point = last
          ? { left: last.left + (target.left - last.left) * EASE, top: last.top + (target.top - last.top) * EASE }
          : target;
        shown.current.set(pointer.key, point);
        const trail = (trails.current.get(pointer.key) ?? []).filter(({ at }) => now - at < TRAIL_MS);
        const moved = !last || Math.hypot(point.left - last.left, point.top - last.top) > 0.5;
        if (pointer.style === 'laser' && moved) {
          trail.push({ ...point, at: now });
        }
        trails.current.set(pointer.key, pointer.style === 'laser' ? trail : []);
        return [
          {
            key: pointer.key,
            ...point,
            trail: trail.map(({ left, top, at }) => ({ left, top, age: (now - at) / TRAIL_MS })),
          },
        ];
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

const Laser = ({ color, name }: { color: string; name: string }) => (
  <>
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

/** A laser's tail: segments along the path it took, thinning and fading with age. */
const Trail = ({ color, trail }: { color: string; trail: Placed['trail'] }) => (
  <>
    {trail.slice(1).map((point, index) => {
      const from = trail[index];
      const fresh = 1 - point.age;
      return (
        <line
          key={index}
          x1={from.left}
          y1={from.top}
          x2={point.left}
          y2={point.top}
          stroke={color}
          strokeLinecap='round'
          strokeWidth={1 + 5 * fresh}
          strokeOpacity={0.8 * fresh}
        />
      );
    })}
  </>
);

/** Draws, over the whole window and taking no input, the pointers of the sessions this one shares a follow with. */
export const FollowOverlay = ({ pointers }: FollowOverlayProps) => {
  const placed = usePlaced(pointers);
  const byKey = new Map(pointers.map((pointer) => [pointer.key, pointer]));

  return (
    <div className='fixed inset-0 z-50 pointer-events-none' data-testid='spacePlugin.followOverlay'>
      <svg className='dx-cover size-full overflow-visible' aria-hidden>
        {placed.map(({ key, trail }) => {
          const pointer = byKey.get(key);
          return pointer && trail.length > 1 ? <Trail key={key} color={hueColor(pointer.hue)} trail={trail} /> : null;
        })}
      </svg>
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
