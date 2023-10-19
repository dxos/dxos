//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

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
  onToggleFullscreen,
}: DeckProps) => {
  const [slide, setSlide] = useState(controlledSlide); // TODO(burdon): Move up.
  useEffect(() => {
    if (slide !== controlledSlide) {
      setSlide(controlledSlide);
    }
  }, [slide, controlledSlide]);

  const handleUpdateSlide = (slide: number) => {
    if (onSlideChange) {
      onSlideChange(slide);
    } else {
      setSlide(slide);
    }
  };

  const Expand = () => {
    return (
      <Button variant='ghost' classNames='mx-2 my-4 text-gray-400' onClick={() => onToggleFullscreen?.(!fullscreen)}>
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
          onMove={handleUpdateSlide}
          onClose={() => onToggleFullscreen?.(false)}
        />
      }
    />
  );
};
