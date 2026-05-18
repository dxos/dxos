//
// Copyright 2026 DXOS.org
//

import { RegistryContext, Registry } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { CellGrid, type CellGridProps } from './CellGrid';
import { toggleCell } from './input';
import { type RenderCell } from './render';
import { createCellGridAtoms } from './state/atoms';
import type { Cell, CellCoord, Row, Tool } from './state/types';

type SequencerData = { velocity: number };

const trackColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
];

const renderSequencerCell: RenderCell<SequencerData> = ({ ctx, x, y, w, h, cell }) => {
  const inset = 1;
  const radius = 4;
  const color = trackColors[cell.row % trackColors.length];
  const velocity = cell.data?.velocity ?? 0.8;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3 + velocity * 0.7;
  roundedRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, radius);
  ctx.fill();
  ctx.globalAlpha = 1;
};

const renderDataVizCell: RenderCell<{ magnitude: number }> = ({ ctx, x, y, w, h, cell }) => {
  const magnitude = cell.data?.magnitude ?? 0.5;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(2, (Math.min(w, h) / 2 - 2) * magnitude);
  ctx.fillStyle = `hsl(${(cell.row * 30) % 360}, 70%, 55%)`;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
};

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

// Deterministic 0..1 random — Linear Congruential Generator. Used in story
// seeding so the same args produce the same grid every render.
const makeLcg = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

type Variant = 'sequencer' | 'data-viz';

type StoryProps = Pick<CellGridProps, 'headers'> & {
  variant: Variant;
  tool: Tool;
  numCols: number;
  numRows: number;
  cellWidth: number;
  cellHeight: number;
  playback: boolean;
};

const DefaultStory = ({ variant, tool, numCols, numRows, cellWidth, cellHeight, playback, headers }: StoryProps) => {
  const registry = useContext(RegistryContext);

  const atoms = useMemo(
    () => createCellGridAtoms<SequencerData | { magnitude: number }>({ cellWidth, cellHeight }),
    [cellWidth, cellHeight],
  );
  const rows: Row[] = useMemo(
    () =>
      Array.from({ length: numRows }, (_, index) => ({
        id: `r${index}`,
        label: variant === 'sequencer' ? `Track ${index + 1}` : `Series ${index + 1}`,
      })),
    [numRows, variant],
  );

  // Set tool whenever it changes.
  useEffect(() => {
    registry.set(atoms.tool, tool);
  }, [registry, atoms.tool, tool]);

  // Seed with sample data. Use a deterministic LCG instead of Math.random so
  // story renders are stable across runs (helpful for visual review / snapshots).
  useEffect(() => {
    const next = new Map<string, Cell<SequencerData | { magnitude: number }>>();
    const lcg = makeLcg(0xc0ffee);
    if (variant === 'sequencer') {
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col += row + 2) {
          if (col % (row + 1) === 0) {
            next.set(`${col},${row}`, { col, row, length: 1, data: { velocity: 0.5 + lcg() * 0.5 } });
          }
        }
      }
    } else {
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          if (lcg() < 0.35) {
            next.set(`${col},${row}`, { col, row, length: 1, data: { magnitude: lcg() } });
          }
        }
      }
    }
    registry.set(atoms.cells, next);
  }, [registry, atoms.cells, variant, numCols, numRows]);

  // Animated playhead.
  const playRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playback) {
      registry.set(atoms.playhead, null);
      return;
    }
    const start = performance.now();
    const period = 4_000; // ms to traverse numCols.
    const tick = (now: number) => {
      const t = ((now - start) % period) / period;
      registry.set(atoms.playhead, t * numCols);
      playRef.current = requestAnimationFrame(tick);
    };
    playRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRef.current !== null) {
        cancelAnimationFrame(playRef.current);
      }
      registry.set(atoms.playhead, null);
    };
  }, [registry, atoms.playhead, playback, numCols]);

  const renderCell = variant === 'sequencer' ? (renderSequencerCell as RenderCell) : (renderDataVizCell as RenderCell);

  const handleToggle = (coord: CellCoord) => {
    toggleCell(registry, atoms, coord, ({ col, row }) => ({
      col,
      row,
      length: 1,
      data: variant === 'sequencer' ? { velocity: 0.8 } : { magnitude: 0.7 },
    }));
  };

  return (
    <div className='absolute inset-0'>
      <CellGrid
        atoms={atoms as any}
        rows={rows}
        renderCell={renderCell}
        headers={headers}
        onCellToggle={handleToggle}
      />
    </div>
  );
};

const RegistryWrapper = ({ children }: { children: React.ReactNode }) => {
  const [registry] = useState(() => Registry.make());
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas/CellGrid',
  component: DefaultStory,
  render: (args) => (
    <RegistryWrapper>
      <DefaultStory {...args} />
    </RegistryWrapper>
  ),
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    variant: { control: { type: 'inline-radio' }, options: ['sequencer', 'data-viz'] },
    // 'resize' is deferred (PR description "Deferred / out of v1") — hide from controls.
    tool: { control: { type: 'inline-radio' }, options: ['toggle', 'select'] },
    numCols: { control: { type: 'number', min: 16, max: 1024, step: 16 } },
    numRows: { control: { type: 'number', min: 1, max: 64, step: 1 } },
    cellWidth: { control: { type: 'number', min: 8, max: 64, step: 1 } },
    cellHeight: { control: { type: 'number', min: 12, max: 64, step: 1 } },
    playback: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Sequencer: Story = {
  args: {
    variant: 'sequencer',
    tool: 'toggle',
    numCols: 64,
    numRows: 8,
    cellWidth: 24,
    cellHeight: 24,
    playback: true,
  },
};

export const DataViz: Story = {
  args: {
    variant: 'data-viz',
    tool: 'select',
    numCols: 256,
    numRows: 12,
    cellWidth: 20,
    cellHeight: 20,
    playback: false,
  },
};
