//
// Copyright 2023 DXOS.org
//

import { type ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas, type ChartJSNodeCanvasOptions } from 'chartjs-node-canvas';
import { exec } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export const renderPNG = async (
  configuration: ChartConfiguration,
  opts: ChartJSNodeCanvasOptions = { width: 1920, height: 1080, backgroundColour: 'white' },
) => {
  // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
  const chartJSNodeCanvas = new ChartJSNodeCanvas(opts);

  const image = await chartJSNodeCanvas.renderToBuffer(configuration as any);
  return image;
};

export const showPNG = (data: Buffer) => {
  const filename = `/tmp/${Math.random().toString(36).substring(7)}.png`;
  writeFileSync(filename, data);
  exec(`open ${filename}`);
};

export const BORDER_COLORS = [
  'rgb(54, 162, 235)', // blue
  'rgb(255, 99, 132)', // red
  'rgb(255, 159, 64)', // orange
  'rgb(255, 205, 86)', // yellow
  'rgb(75, 192, 192)', // green
  'rgb(153, 102, 255)', // purple
  'rgb(201, 203, 207)', // grey
];
