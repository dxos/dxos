//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { type Tile } from '#types';
import { type Coord, type ViewBox, axialToPixel } from '#geometry';

import { TileGrid } from '../TileGrid';

export type TileCanvasProps = {
  pattern: Tile.Pattern;
  activeColorIndex: number;
  onCellPaint: (coord: Coord, colorIndex: number) => void;
  onCellClear: (coord: Coord) => void;
};

/**
 * Compute the bounding box of the grid in SVG coordinates.
 * Uses the last tile center + tileSize to get the right/bottom edge.
 */
const computeGridExtent = (gridType: Tile.GridType, gridWidth: number, gridHeight: number, tileSize: number) => {
  const lastCol = axialToPixel(gridWidth - 1, 0, gridType, tileSize);
  const lastRow = axialToPixel(0, gridHeight - 1, gridType, tileSize);
  const lastCorner = axialToPixel(gridWidth - 1, gridHeight - 1, gridType, tileSize);

  const maxX = Math.max(lastCol.x, lastCorner.x) + tileSize;
  const maxY = Math.max(lastRow.y, lastCorner.y) + tileSize;
  return { width: maxX + tileSize, height: maxY + tileSize };
};

export const TileCanvas = ({ pattern, activeColorIndex, onCellPaint, onCellClear }: TileCanvasProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCell, setHoveredCell] = useState<Coord | undefined>();
  const [isPanning, setIsPanning] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { tileSize, gridType, gridWidth, gridHeight, groutWidth } = pattern;
  const extent = computeGridExtent(gridType, gridWidth, gridHeight, tileSize);
  const padding = tileSize;

  const [viewBox, setViewBox] = useState<ViewBox>({
    x: -padding,
    y: -padding,
    width: extent.width + padding,
    height: extent.height + padding,
  });

  const handleCellClick = useCallback(
    (coord: Coord) => {
      const key = `${coord.q},${coord.r}`;
      if (pattern.cells[key] === activeColorIndex) {
        onCellClear(coord);
      } else {
        onCellPaint(coord, activeColorIndex);
      }
    },
    [pattern.cells, activeColorIndex, onCellPaint, onCellClear],
  );

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const scale = event.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((prev) => {
      const cx = prev.x + prev.width / 2;
      const cy = prev.y + prev.height / 2;
      const newWidth = prev.width * scale;
      const newHeight = prev.height * scale;
      return {
        x: cx - newWidth / 2,
        y: cy - newHeight / 2,
        width: newWidth,
        height: newHeight,
      };
    });
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 1 || event.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    } else if (event.button === 0) {
      setIsPainting(true);
    }
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isPanning || !svgRef.current) {
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      const dx = (event.clientX - panStart.x) * scaleX;
      const dy = (event.clientY - panStart.y) * scaleY;
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      setPanStart({ x: event.clientX, y: event.clientY });
    },
    [isPanning, panStart, viewBox],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsPainting(false);
  }, []);

  const handleCellHover = useCallback(
    (coord: Coord) => {
      setHoveredCell(coord);
      if (isPainting) {
        onCellPaint(coord, activeColorIndex);
      }
    },
    [isPainting, activeColorIndex, onCellPaint],
  );

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  const showRoom = pattern.width != null && pattern.height != null;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBoxStr}
      className='grow w-full h-full'
      preserveAspectRatio='xMidYMid meet'
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <TileGrid
        gridType={gridType}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        tileSize={tileSize}
        groutWidth={groutWidth}
        palette={pattern.palette as unknown as string[]}
        cells={pattern.cells}
        viewBox={viewBox}
        hoveredCell={hoveredCell}
        onClick={handleCellClick}
        onHover={handleCellHover}
      />

      {showRoom && (
        <rect
          x={0}
          y={0}
          width={pattern.width}
          height={pattern.height}
          fill='none'
          stroke='#ef4444'
          strokeWidth={2}
          strokeDasharray='8,4'
          pointerEvents='none'
        />
      )}

      {showRoom && (
        <g pointerEvents='none'>
          <text x={pattern.width! / 2} y={-10} textAnchor='middle' fill='#94a3b8' fontSize={12}>
            {pattern.width}mm
          </text>
          <text
            x={-10}
            y={pattern.height! / 2}
            textAnchor='end'
            fill='#94a3b8'
            fontSize={12}
            transform={`rotate(-90, -10, ${pattern.height! / 2})`}
          >
            {pattern.height}mm
          </text>
        </g>
      )}
    </svg>
  );
};
