//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ScreenFrame } from '#model';

export type ScreenLayerProps = { frame: ScreenFrame };

/**
 * Screen text above the stage (F-8.3, F-8.5): the side title at the middle left, the caption over the centre, and the
 * curtain over everything. Opacities come from the frame, computed from the time, so an export frame matches playback.
 */
export const ScreenLayer = ({ frame: { caption, sideTitle, curtain } }: ScreenLayerProps) => (
  <div className='dx-cover pointer-events-none overflow-hidden' data-testid='animator.screen'>
    {sideTitle && sideTitle.opacity > 0 && (
      <div
        className='absolute left-[6%] top-1/2 -translate-y-1/2 flex flex-col text-4xl font-light leading-tight text-fg'
        style={{ opacity: sideTitle.opacity }}
        data-testid='animator.side-title'
      >
        {sideTitle.lines.map((line, index) => (
          <span key={index}>{line}</span>
        ))}
      </div>
    )}
    {caption && caption.opacity > 0 && (
      <div
        className='dx-cover flex flex-col items-center justify-center gap-2 text-center text-fg'
        style={{ opacity: caption.opacity, color: caption.color }}
        data-testid='animator.caption'
      >
        {caption.image && <img src={caption.image.src} alt='' className='max-h-[20%] max-w-[60%]' />}
        {caption.lines.map((line, index) => (
          <span
            key={index}
            className={index === 0 && !caption.image ? 'text-4xl font-light' : 'text-xl'}
            // Each line's own opacity, relative to the caption's, since the caption's applies to them all.
            style={{ opacity: caption.opacity > 0 ? line.opacity / caption.opacity : 0 }}
          >
            {line.text}
          </span>
        ))}
      </div>
    )}
    {curtain && curtain.opacity > 0 && (
      <div
        className='dx-cover'
        style={{ background: curtain.color, opacity: curtain.opacity }}
        data-testid='animator.curtain'
      />
    )}
  </div>
);
