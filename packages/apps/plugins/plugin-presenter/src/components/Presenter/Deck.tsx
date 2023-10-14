//
// Copyright 2023 DXOS.org
//

import { Play, X } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { PageNumber, Pager } from './Pager';
import { Presenter } from './Presenter';
import { useControlledValue } from '../../util';

export type DeckProps = {
  slides?: string[];
  slide?: number;
  running?: boolean;
  onChange?: (index: number) => void;
  onStart?: () => void;
  onStop?: () => void;
};

export const Deck = ({ slides = [], slide: controlledSlide = 0, running, onChange, onStart, onStop }: DeckProps) => {
  const [slide, setSlide] = useControlledValue(controlledSlide);
  const handleUpdateSlide = (slide: number) => {
    setSlide(slide);
    onChange?.(slide);
  };

  const Expand = () => {
    return (
      <Button variant='ghost' onClick={() => (running ? onStop?.() : onStart?.())}>
        {(running && <X className={mx(getSize(8), 'text-gray-400')} />) || (
          <Play className={mx(getSize(8), 'text-gray-400')} />
        )}
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
          keys={running}
          onChange={handleUpdateSlide}
          onExit={() => onStop?.()}
        />
      }
    />
  );
};
