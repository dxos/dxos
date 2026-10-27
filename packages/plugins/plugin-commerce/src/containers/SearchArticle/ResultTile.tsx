//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Result } from '#types';

import { ResultCard } from '../ResultCard/index.ts';

export type ResultTileProps = {
  result: Result.Result;
  current?: boolean;
  starred?: boolean;
  onToggleStar?: (result: Result.Result) => void;
};

/** Masonry tile wrapping a {@link ResultCard}; the masonry item around it takes focus and selects it. */
export const ResultTile = ({ result, current, starred, onToggleStar }: ResultTileProps) => (
  <ResultCard
    subject={result}
    current={current}
    aria-current={current || undefined}
    starred={starred}
    onToggleStar={onToggleStar ? () => onToggleStar(result) : undefined}
  />
);

ResultTile.displayName = 'ResultTile';
