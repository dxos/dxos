//
// Copyright 2022 DXOS.org
//

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Utility to generate a set of rectangles that tessellate the screen.
 */
export class Grid {
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly spacing: number,
    private readonly marginTop: number
  ) {}

  /**
   * @returns [rows, columns]
   */
  createDimensions(minWidth: number, minHeight: number): [number, number] {
    return [Math.floor(this.height / minHeight), Math.floor(this.width / minWidth)];
  }

  /**
   * Create a collection of bounds.
   */
  createGrid(rows: number, columns: number): Bounds[] {
    const width = Math.round((this.width - (columns - 1) * this.spacing) / columns);
    const height = Math.round((this.height - this.marginTop - (rows - 1) * this.spacing) / rows);

    const grid: Bounds[] = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        grid.push({
          x: column * (width + this.spacing),
          y: this.marginTop + row * (height + this.spacing),
          width,
          height
        });
      }
    }

    return grid;
  }
}
