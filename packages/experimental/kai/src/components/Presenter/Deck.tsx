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
};

export const Deck = ({ slides = [] }: DeckProps) => {
  const [index, setIndex] = useState(1);

  // TODO(burdon): Navigate.
  const handleToggle = () => {};

  const Expand = () => {
    return (
      <Button variant='ghost' className='mx-2 my-4 text-gray-400' onClick={handleToggle}>
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
