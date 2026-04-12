//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

import { TileCanvas } from '#components';
import { type Coord } from '#geometry';
import { type Tile } from '#types';

export type TileArticleProps = AppSurface.ObjectArticleProps<Tile.Pattern>;

export const TileArticle = ({ role, subject: pattern }: TileArticleProps) => {
  const [activeColorIndex, setActiveColorIndex] = useState(0);

  const handleCellPaint = useCallback(
    (coord: Coord, colorIndex: number) => {
      Obj.change(pattern, (pattern) => {
        const mutable = pattern as Obj.Mutable<typeof pattern>;
        mutable.cells[`${coord.q},${coord.r}`] = colorIndex;
      });
    },
    [pattern],
  );

  const handleCellClear = useCallback(
    (coord: Coord) => {
      Obj.change(pattern, (pattern) => {
        const mutable = pattern as Obj.Mutable<typeof pattern>;
        delete mutable.cells[`${coord.q},${coord.r}`];
      });
    },
    [pattern],
  );

  return (
    <Panel.Root role={role} classNames='flex flex-col grow overflow-hidden'>
      <TileCanvas
        pattern={pattern}
        activeColorIndex={activeColorIndex}
        onCellPaint={handleCellPaint}
        onCellClear={handleCellClear}
      />
    </Panel.Root>
  );
};
