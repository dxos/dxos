//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button, getSize, mx } from '@dxos/react-components';

import { PageNumber, Pager } from './Pager';
import { Presenter } from './Presenter';

export type DeckProps = {
  slides?: string[];
  fullscreen?: boolean;
  onToggleFullscreen?: (fullscreen: boolean) => void;
};

export const Deck = ({ slides = [], fullscreen, onToggleFullscreen }: DeckProps) => {
  const [index, setIndex] = useState(1);

  const Expand = () => {
    return (
      <Button variant='ghost' className='mx-2 my-4 text-gray-400' onClick={() => onToggleFullscreen?.(!fullscreen)}>
        <ArrowsOut className={mx(getSize(8))} />
      </Button>
    );
  };

  return (
    <Presenter
      content={slides[index - 1] ?? ''}
      topRight={<Expand />}
      bottomLeft={<PageNumber index={index} count={slides.length} />}
      bottomRight={<Pager index={index} count={slides.length} onMove={setIndex} />}
    />
  );
};
