//
// Copyright 2026 DXOS.org
//

import echoCenter from '../../../../packages/ui/brand/assets/backgrounds/echo-center.svg?raw';
import echoRight from '../../../../packages/ui/brand/assets/backgrounds/echo-right.svg?raw';
import edgeCenter from '../../../../packages/ui/brand/assets/backgrounds/edge-center.svg?raw';
import edgeRight from '../../../../packages/ui/brand/assets/backgrounds/edge-right.svg?raw';
import haloCenter from '../../../../packages/ui/brand/assets/backgrounds/halo-center.svg?raw';
import haloRight from '../../../../packages/ui/brand/assets/backgrounds/halo-right.svg?raw';
import meshCenter from '../../../../packages/ui/brand/assets/backgrounds/mesh-center.svg?raw';
import meshRight from '../../../../packages/ui/brand/assets/backgrounds/mesh-right.svg?raw';
import plexCenter from '../../../../packages/ui/brand/assets/backgrounds/plex-center.svg?raw';
import plexRight from '../../../../packages/ui/brand/assets/backgrounds/plex-right.svg?raw';
// The brand's background art, one per docs topic, in the docs' own section colors [D-273].
import sageCenter from '../../../../packages/ui/brand/assets/backgrounds/sage-center.svg?raw';
import sageRight from '../../../../packages/ui/brand/assets/backgrounds/sage-right.svg?raw';
import tileCenter from '../../../../packages/ui/brand/assets/backgrounds/tile-center.svg?raw';
import tileRight from '../../../../packages/ui/brand/assets/backgrounds/tile-right.svg?raw';

/** Each topic's color: what its rays are drawn in, and what marks the topic wherever the art is not drawn. */
export const SUITE_COLORS = {
  echo: 'rgb(20,117,79)',
  edge: 'rgb(217,91,60)',
  halo: 'rgb(201,138,30)',
  mesh: 'rgb(30,99,139)',
  plex: 'rgb(124,96,186)',
  sage: 'rgb(122,150,112)',
  tile: 'rgb(150,37,79)',
} as const;

export type SuiteTopic = keyof typeof SUITE_COLORS;

/** The brand art's lines stop this far past its 1920 x 1080 frame. */
const FRAME = { left: -20, right: 1940, top: -20, bottom: 1100 };

/** Far enough past the frame for any crop the docs take, the two-wide card's included. */
const REACH = 4000;

const onFrame = ([x, y]: [number, number]) =>
  [x - FRAME.left, x - FRAME.right, y - FRAME.top, y - FRAME.bottom].some((gap) => Math.abs(gap) < 0.5);

/** A line's path with each end that stops at the frame run on along its own direction. */
const extend = (data: string): string => {
  const points = [...data.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(([, x, y]): [number, number] => [
    Number(x),
    Number(y),
  ]);
  if (points.length < 2 || /Z/.test(data) || (data.match(/M/g)?.length ?? 0) > 1) {
    return data;
  }
  const run = ([x, y]: [number, number], [fromX, fromY]: [number, number]): [number, number] => {
    const length = Math.hypot(x - fromX, y - fromY);
    return length === 0 ? [x, y] : [x + ((x - fromX) / length) * REACH, y + ((y - fromY) / length) * REACH];
  };
  const last = points.length - 1;
  const [first, end] = [points[0], points[last]];
  if (onFrame(first)) {
    points[0] = run(first, points[1]);
  }
  if (onFrame(end)) {
    points[last] = run(end, points[last - 1]);
  }
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
};

/**
 * The brand's art as the docs draw it: in the topic's color, and with its lines run on past the frame, since the docs
 * crop it to windows wider than the frame and a line that stopped at the frame would end in view.
 */
const docsArt = (svg: string, color: string): string =>
  svg
    .replace(/(<svg [^>]*?) color="[^"]*"/, `$1 color="${color}"`)
    .replace(/<g id="lines"[\s\S]*?<\/g>/, (group) =>
      group.replace(/ d="([^"]*)"/g, (_, data: string) => ` d="${extend(data)}"`),
    );

const suite = (art: Record<SuiteTopic, string>): Record<SuiteTopic, string> => ({
  echo: docsArt(art.echo, SUITE_COLORS.echo),
  edge: docsArt(art.edge, SUITE_COLORS.edge),
  halo: docsArt(art.halo, SUITE_COLORS.halo),
  mesh: docsArt(art.mesh, SUITE_COLORS.mesh),
  plex: docsArt(art.plex, SUITE_COLORS.plex),
  sage: docsArt(art.sage, SUITE_COLORS.sage),
  tile: docsArt(art.tile, SUITE_COLORS.tile),
});

/** Hero art, with the mark on the right at (1440, 540). */
export const SUITE_BACKGROUNDS = suite({
  echo: echoRight,
  edge: edgeRight,
  halo: haloRight,
  mesh: meshRight,
  plex: plexRight,
  sage: sageRight,
  tile: tileRight,
});

/** Card art, with the mark in the middle at (960, 540). */
export const SUITE_MARKS = suite({
  echo: echoCenter,
  edge: edgeCenter,
  halo: haloCenter,
  mesh: meshCenter,
  plex: plexCenter,
  sage: sageCenter,
  tile: tileCenter,
});

/** The docs home's card order; ECHO's card is two wide, so seven cards fill two rows of four [D-272]. */
export const SUITE_ORDER: SuiteTopic[] = ['echo', 'halo', 'mesh', 'plex', 'tile', 'edge', 'sage'];
