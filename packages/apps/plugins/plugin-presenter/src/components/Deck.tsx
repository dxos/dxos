//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { PageNumber, Pager } from './Pager';
import { Presenter } from './Presenter';
import { useControlledValue } from '../util';

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
  slide: controlledSlide = 0,
  fullscreen,
  onSlideChange,
  onToggleFullscreen,
}: DeckProps) => {
  const [slide, setSlide] = useControlledValue(controlledSlide);
  const handleUpdateSlide = (slide: number) => {
    setSlide(slide);
    onSlideChange?.(slide);
  };

  const Expand = () => {
    return (
      <Button variant='ghost' onClick={() => onToggleFullscreen?.(!fullscreen)}>
        <ArrowsOut className={mx(getSize(8), 'mx-2 my-4 text-gray-400')} />
      </Button>
    );
  };

  return (
    <Presenter
      content={slides[slide] ?? ''}
      topRight={<Expand />}
      bottomLeft={<PageNumber index={slide} count={slides.length} />}
      bottomRight={
        <Pager
          index={slide}
          count={slides.length}
          keys={fullscreen}
          onChange={handleUpdateSlide}
          onClose={() => onToggleFullscreen?.(false)}
        />
      }
    />
  );
};
