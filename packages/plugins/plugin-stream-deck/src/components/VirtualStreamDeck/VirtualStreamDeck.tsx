//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type DialSpec, type KeySpec } from '#model';
import { type Protocol } from '#protocol';
import { renderDial, renderEmptyKey, renderKey, useIcons } from '#render';

export type VirtualStreamDeckProps = {
  device: Protocol.DeviceProfile;
  keys: readonly (KeySpec | null)[];
  dials: readonly (DialSpec | null)[];
  onKeyPress?: (slot: number, spec: KeySpec) => void;
};

/**
 * On-screen replica of the hardware. It renders the very SVG the device is sent, so what the
 * storybook (and the app panel) shows is what the keys show — the layout is reviewable, and
 * regressions are visible, without the device attached.
 */
export const VirtualStreamDeck = ({ device, keys, dials, onKeyPress }: VirtualStreamDeckProps) => {
  const icons = useIcons(useMemo(() => keys.flatMap((key) => (key ? [key.icon] : [])), [keys]));
  const images = useMemo(
    () =>
      keys.map((key) =>
        key ? renderKey(key, { size: device.keySize[0], icon: icons[key.icon] }) : renderEmptyKey(device.keySize[0]),
      ),
    [keys, icons, device],
  );
  const feedback = useMemo(() => dials.map((dial) => (dial ? renderDial(dial) : null)), [dials]);

  return (
    <div className='flex flex-col gap-4 p-4 rounded-lg bg-neutral-900'>
      <div className='grid grid-cols-4 gap-2'>
        {images.map((image, slot) => {
          const spec = keys[slot];
          return (
            <button
              key={slot}
              type='button'
              disabled={!spec}
              className='aspect-square rounded overflow-hidden disabled:cursor-default'
              data-testid={`stream-deck.key-${slot}`}
              onClick={spec ? () => onKeyPress?.(slot, spec) : undefined}
              // The device is sent this exact string; rendering it any other way would let the two drift.
              dangerouslySetInnerHTML={{ __html: image }}
            />
          );
        })}
      </div>

      <div className='grid grid-cols-4 gap-2'>
        {feedback.map((segment, slot) => (
          <div
            key={slot}
            className='flex flex-col justify-center gap-1 p-2 rounded bg-neutral-950 text-neutral-100 aspect-[2/1]'
            data-testid={`stream-deck.dial-${slot}`}
          >
            {segment && (
              <>
                <div className='text-xs text-neutral-400 truncate'>{segment.title}</div>
                <div className='text-sm tabular-nums'>{segment.value}</div>
                {segment.bar !== undefined && (
                  <div className='h-1 rounded bg-neutral-700'>
                    <div className='h-1 rounded bg-cyan-400' style={{ width: `${Math.round(segment.bar * 100)}%` }} />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

VirtualStreamDeck.displayName = 'VirtualStreamDeck';
