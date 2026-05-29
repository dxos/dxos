//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Focus } from '@dxos/react-ui';

import { type Result } from '../../types';
import { ResultCard } from '../ResultCard';

export type ResultTileProps = {
  result: Result.Result;
  current?: boolean;
  onSelect?: (id: string) => void;
};

/** Selectable masonry tile wrapping a {@link ResultCard}. */
export const ResultTile = ({ result, current, onSelect }: ResultTileProps) => {
  // `Focus.Item` calls `onCurrentChange` on click and on Enter.
  const handleCurrentChange = useCallback(() => {
    onSelect?.(Obj.getURI(result));
  }, [onSelect, result]);

  return (
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <ResultCard subject={result} current={current} />
    </Focus.Item>
  );
};
