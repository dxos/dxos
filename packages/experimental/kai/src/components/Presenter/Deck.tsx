//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Button, getSize, mx } from '@dxos/react-components';

import { PageNumber, Pager } from './Pager';
import { Presenter } from './Presenter';

export type DeckProps = {
  slides?: string[];
  slide?: number;
  fullscreen?: boolean;
  onSlideChange?: (index: number) => void;
  onToggleFullscreen?: (fullscreen: boolean) => void;
};

// TODO(burdon): Subscribe to fullscreen/index.
export const Deck = ({
  slides = [],
  slide: controlledSlide = 1,
  fullscreen,
  onSlideChange,
  onToggleFullscreen
}: DeckProps) => {
  const [slide, setSlide] = useState(controlledSlide);
  useEffect(() => {
    onSlideChange?.(slide);
  }, [slide]);

  const Expand = () => {
    return (
      <Button variant='ghost' className='mx-2 my-4 text-gray-400' onClick={() => onToggleFullscreen?.(!fullscreen)}>
        <ArrowsOut className={mx(getSize(8))} />
      </Button>
    );
  };

  return (
    <Presenter
      content={slides[slide - 1] ?? ''}
      topRight={<Expand />}
      bottomLeft={<PageNumber index={slide} count={slides.length} />}
      bottomRight={
        <Pager
          index={slide}
          count={slides.length}
          keys={fullscreen}
          onMove={setSlide}
          onClose={() => onToggleFullscreen?.(false)}
        />
      }
    />
  );
};
