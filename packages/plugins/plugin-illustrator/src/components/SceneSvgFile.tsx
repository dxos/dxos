//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { type Scene } from '@dxos/diagram';

import { SceneSvg } from './SceneSvg.tsx';

/**
 * The renderer styles with Tailwind utilities; a file on disk has no stylesheet, so the export
 * inlines the handful it uses (light theme, Tailwind's neutral palette).
 */
const STYLE = `
  svg { font-family: ui-sans-serif, system-ui, sans-serif; color: #262626; background: #ffffff; }
  .stroke-current { stroke: currentColor; }
  .fill-current { fill: currentColor; }
  .fill-transparent { fill: transparent; }
  .fill-none { fill: none; }
  .stroke-none { stroke: none; }
  .fill-neutral-100 { fill: #f5f5f5; }
  .fill-neutral-800 { fill: #262626; }
  .stroke-neutral-800 { stroke: #262626; }
  svg { --surface-bg: #ffffff; }
  .text-neutral-400 { color: #a3a3a3; }
  .text-neutral-500 { color: #737373; }
  .text-sky-500 { color: #0ea5e9; }
  .text-emerald-500 { color: #10b981; }
  .text-amber-500 { color: #f59e0b; }
  .text-violet-500 { color: #8b5cf6; }
  .text-orange-500 { color: #f97316; }
  .text-rose-500 { color: #f43f5e; }
  .stroke-neutral-500\\/20 { stroke: rgba(115, 115, 115, 0.2); }
`;

/**
 * A standalone SVG file of a scene: the component's markup, width and height from its viewBox, and the
 * inline styles. Without the editor's background grid, which on a page is ink that carries no information.
 */
export const toSvgFile = (objects: readonly Scene.WorldObject[]): string => {
  const markup = renderToStaticMarkup(<SceneSvg objects={objects} />);
  const viewBox = /viewBox="([^"]+)"/.exec(markup)?.[1].split(' ').map(Number) ?? [0, 0, 0, 0];
  return markup
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox[2]}" height="${viewBox[3]}" `)
    .replace('<defs>', `<style>${STYLE}</style><defs>`);
};
