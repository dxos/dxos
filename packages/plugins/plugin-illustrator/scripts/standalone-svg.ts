//
// Copyright 2026 DXOS.org
//

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SceneSvg } from '../src/components/SceneSvg';
import type * as Scene from '../src/model/scene';
import { GRID } from '../src/model/uml-grid';

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
  .stroke-neutral-500\\/20 { stroke: rgba(115, 115, 115, 0.2); }
`;

export type StandaloneSvgOptions = {
  /** Draw the alignment grid at this spacing; `false` for a clean export. */
  grid?: number | false;
};

/** Standalone SVG: the component's markup plus width/height from its viewBox and the inline styles. */
export const toStandaloneSvg = (objects: readonly Scene.WorldObject[], { grid = GRID }: StandaloneSvgOptions = {}) => {
  const markup = renderToStaticMarkup(createElement(SceneSvg, { objects, grid: grid || undefined }));
  const viewBox = /viewBox="([^"]+)"/.exec(markup)?.[1].split(' ').map(Number) ?? [0, 0, 0, 0];
  return markup
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox[2]}" height="${viewBox[3]}" `)
    .replace('<defs>', `<style>${STYLE}</style><defs>`);
};
