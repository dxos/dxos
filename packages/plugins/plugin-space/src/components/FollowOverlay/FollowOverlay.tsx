//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Attention } from '@dxos/react-ui-attention/types';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { SpaceNamespace } from '../../namespace.ts';
import { type PlankPosition, fromPlankPosition } from '../../util/pointer.ts';

/** A pointer to draw: whose it is, and where in which plank. */
export type ShownPointer = PlankPosition & {
  /** Stable per session, for React. */
  key: string;
  name: string;
  /** A palette hue such as `red`. */
  hue: string;
  plank: string;
};

export type FollowOverlayProps = {
  /** Set while this session follows someone: the frame and its label show. */
  leader?: { name: string; hue: string };
  pointers: readonly ShownPointer[];
  onStop?: () => void;
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

/**
 * Draws over the whole window, taking no input but Stop: while following, a frame in the leader's colour labelled with
 * their name; and the pointers of the sessions this one shares a follow with.
 */
export const FollowOverlay = ({ leader, pointers, onStop }: FollowOverlayProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const placed = usePlaced(pointers);
  const byKey = new Map(pointers.map((pointer) => [pointer.key, pointer]));

  return (
    <div className='fixed inset-0 z-50 pointer-events-none' data-testid='spacePlugin.followOverlay'>
      {leader && (
        <div
          className='dx-cover border-4'
          style={{ borderColor: hueColor(leader.hue) }}
          data-testid='spacePlugin.followOverlay.frame'
        >
          <div
            className='absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 ps-3 pe-1 py-1 rounded-b-md text-sm text-white pointer-events-auto'
            style={{ backgroundColor: hueColor(leader.hue) }}
          >
            <span data-testid='spacePlugin.followOverlay.label'>
              {t('follow-overlay.label', { name: leader.name })}
            </span>
            <Button.Root
              variant='ghost'
              compact
              size='sm'
              icon='ph--stop--regular'
              label={t('presence-stop-following.label')}
              data-testid='spacePlugin.followOverlay.stop'
              onClick={onStop}
            />
          </div>
        </div>
      )}
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
          >
            <svg width='18' height='18' viewBox='0 0 18 18' className='block'>
              <path
                d='M1 1 L1 15 L5 11 L8 17 L10.5 16 L7.5 10 L13 10 Z'
                fill={color}
                stroke='white'
                strokeWidth='1.25'
              />
            </svg>
            <span
              className='absolute left-4 top-4 px-1.5 py-0.5 rounded-sm text-xs text-white whitespace-nowrap'
              style={{ backgroundColor: color }}
            >
              {pointer.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
