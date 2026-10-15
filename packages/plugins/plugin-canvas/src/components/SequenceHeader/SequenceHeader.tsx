//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

/** The bar the canvas's own toolbars sit in, so the controls match them. */
const BAR = 'gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator';

export type SequenceHeaderProps = {
  title: string;
  caption: string;
  /** The scene shown, from 0, and how many there are. */
  index: number;
  count: number;
  playing: boolean;
  /** How far the title and caption have faded in (0 to 1); the controls do not fade with them. */
  opacity?: number;
  /** Off, the controls keep their place but are not drawn (they still answer a script's clicks). */
  controls?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onPlayingChange?: (playing: boolean) => void;
};

/**
 * The strip above a sequence of scenes: the scene's title and caption centred, its number out of the total at the
 * left, and previous, play or pause, and next at the right. Previous and next stop at the ends.
 */
export const SequenceHeader = ({
  title,
  caption,
  index,
  count,
  playing,
  opacity = 1,
  controls = true,
  onPrevious,
  onNext,
  onPlayingChange,
}: SequenceHeaderProps) => (
  <div className='relative w-full shrink-0 bg-base-surface' data-testid='sequence-header'>
    <div className='flex flex-col items-center gap-1 py-4' style={{ opacity }}>
      <div className='absolute top-3 left-4 text-sm text-fg-muted tabular-nums' data-testid='sequence-counter'>
        {index + 1} / {count}
      </div>
      <div className='text-3xl'>{title}</div>
      <div className='text-lg text-fg-muted'>{caption}</div>
    </div>
    <div className={mx('absolute top-2 right-2 w-max', !controls && 'invisible')}>
      <Toolbar.Root classNames={BAR}>
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--caret-left--regular'
          label='Previous scene'
          disabled={index === 0}
          onClick={onPrevious}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          label={playing ? 'Pause' : 'Play'}
          onClick={() => onPlayingChange?.(!playing)}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--caret-right--regular'
          label='Next scene'
          disabled={index === count - 1}
          onClick={onNext}
        />
      </Toolbar.Root>
    </div>
  </div>
);
