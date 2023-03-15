//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { PageNumber, Pager } from './Pager';
import { Presenter } from './Presenter';

export type DeckProps = {
  slides?: string[];
};

// TODO(burdon): Paging.
export const Deck = ({ slides = [] }: DeckProps) => {
  const [index, setIndex] = useState(1);

  return (
    <Presenter
      content={slides[index - 1] ?? ''}
      bottomLeft={<PageNumber index={index} count={slides.length} />}
      bottomRight={<Pager index={index} count={slides.length} onMove={setIndex} />}
    />
  );
};
