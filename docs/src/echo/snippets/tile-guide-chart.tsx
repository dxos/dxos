//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { Plot, type PlotType, toPlotData } from '@dxos/react-ui-plot';
import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';

// #region chart
/** Rows of a table: the header names each column, and the first column labels the x axis. One series draws no legend. */
const SALES = toPlotData(
  [
    ['Month', 'Sales'],
    ['Jan', 12],
    ['Feb', 18],
    ['Mar', 15],
    ['Apr', 22],
    ['May', 26],
    ['Jun', 24],
  ],
  { header: true },
);

const TYPES: Record<string, PlotType> = {
  Bar: 'bar',
  Radar: 'radar',
  Pie: 'pie',
};

/** The same data as a bar, radar or pie chart. */
export const SalesChart = () => {
  const [type, setType] = useState<PlotType>('bar');

  return (
    <div className='grid h-full grid-rows-[min-content_1fr]'>
      <Toolbar.Root>
        {Object.entries(TYPES).map(([label, value]) => (
          <Button.Root
            key={value}
            variant={value === type ? 'primary' : 'ghost'}
            onClick={() => setType(value)}
          >
            {label}
          </Button.Root>
        ))}
      </Toolbar.Root>
      <Plot data={SALES} options={{ type, grid: true }} />
    </div>
  );
};
// #endregion
