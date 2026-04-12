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

const DEFAULT_COLOR = '#3b82f6';

export const TileArticle = ({ role, subject: pattern }: TileArticleProps) => {
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR);

  const handleCellPaint = useCallback(
    (coord: Coord, color: string) => {
      Obj.change(pattern, (pattern) => {
        const mutable = pattern as Obj.Mutable<typeof pattern>;
        mutable.cells[`${coord.q},${coord.r}`] = color;
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
      <Panel.Content>
        <TileCanvas
          pattern={pattern}
          activeColor={activeColor}
          onCellPaint={handleCellPaint}
          onCellClear={handleCellClear}
        />
      </Panel.Content>
    </Panel.Root>
  );
};
