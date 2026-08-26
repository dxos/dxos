//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as Protocol from '#protocol';

export type VirtualStreamDeckProps = {
  device: Protocol.DeviceProfile;
  frame: Protocol.Frame;
  onKeyPress?: (slot: number, target: string) => void;
};

/**
 * On-screen replica of the hardware, rendering the very frame the device is sent — so what this
 * shows is what the keys show, and the layout is reviewable without the device attached.
 */
export const VirtualStreamDeck = ({ device, frame, onKeyPress }: VirtualStreamDeckProps) => {
  return (
    <div className='flex flex-col gap-4 p-4 rounded-lg bg-neutral-900'>
      <div className='grid grid-cols-4 gap-2'>
        {frame.keys.map((key, slot) => (
          <button
            key={slot}
            type='button'
            disabled={!key?.target}
            // The frame's SVG carries the device's pixel size, so the tile scales it rather than
            // cropping it — without this the label falls outside a tile narrower than a key.
            className='aspect-square rounded overflow-hidden disabled:cursor-default [&>svg]:w-full [&>svg]:h-full'
            data-testid={`stream-deck.key-${slot}`}
            onClick={key?.target ? () => onKeyPress?.(slot, key.target!) : undefined}
            // The device is sent this exact string; rendering it any other way would let the two drift.
            dangerouslySetInnerHTML={{ __html: key?.svg ?? '' }}
          />
        ))}
      </div>

      <div className='grid grid-cols-4 gap-2'>
        {Array.from({ length: device.dials }, (_, slot) => {
          const segment = frame.dials[slot];
          return (
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
          );
        })}
      </div>
    </div>
  );
};

VirtualStreamDeck.displayName = 'VirtualStreamDeck';
