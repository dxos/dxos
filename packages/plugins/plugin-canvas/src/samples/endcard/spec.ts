//
// Copyright 2026 DXOS.org
//

//
// The DXOS end card (tools/autocue `EndCard`) as a scene document: the logo is a composite object of path nodes, the
// tagline, rule and call to action are elements, and their entrances are a shot's keys on the elements. Scene units are
// the 1920x1080 video's pixels with the origin at the frame's centre, so `EndCard`'s sizes and offsets carry over.
//

import { type Easing, type Timeline, createTimeline, setKey } from '@dxos/animation';
import { DXOS_HORIZONTAL_LOCKUP, DXOS_LOCKUP_GLYPHS, type DXOSLockupGlyph } from '@dxos/brand/paths';
import { type RenderList2D, compositeBounds, instancePorts, pathBounds } from '@dxos/react-ui-canvas';
import { fromRenderLists2D } from '@dxos/react-ui-canvas/headless';
import {
  type Bounds,
  type InstanceNode,
  type Node,
  type NoteNode,
  type PathNode,
  type Point,
  type Scene,
  type Size,
  findLayout,
} from '@dxos/scene';

/** The video's frame in scene units. */
export const FRAME: Bounds = { x: -960, y: -540, width: 1920, height: 1080 };

/** Seconds, as `TIMING.spot10.endCard`. */
export const DURATION = 3;

export const ROOT = 'endcard';
export const LOGO_OBJECT = 'logo-object';
export const LOGO = 'logo';

/** `EndCard`'s eases: Remotion's `Easing.out(Easing.cubic)` is the timeline's `ease-out`, and `out(back(1.6))` a bezier. */
const OUT: Easing = 'ease-out';
const BACK_OUT: Easing = { bezier: [0.34, 1.56, 0.64, 1] };

/**
 * The lockup image is 340 px tall (`END_CARD.markHeight`) for a 2048x1024 view box, at the top of a column 15% down the
 * frame; its paths sit in the lockup's group transform (`@dxos/brand/paths`). One artwork unit is this many scene units.
 */
const { transform } = DXOS_HORIZONTAL_LOCKUP;
const IMAGE_SCALE = 340 / 1024;
const ARTWORK_SCALE = transform.scale * IMAGE_SCALE;
const ARTWORK_ORIGIN: Point = {
  x: -340 + transform.x * IMAGE_SCALE,
  y: 0.15 * 1080 - 540 + transform.y * IMAGE_SCALE,
};

/** The logo scales about 50% across and 60% down its 680x340 box (`transformOrigin: '50% 60%'`). */
export const SCALE_ORIGIN: Point = { x: 0, y: 0.15 * 1080 + 340 * 0.6 - 540 };

/** A glyph of the lockup as a path node, framed by its own outline. */
const glyphNode = (glyph: DXOSLockupGlyph, index: number): PathNode => {
  const d = DXOS_HORIZONTAL_LOCKUP.paths[glyph];
  const box = pathBounds(d) ?? { x: 0, y: 0, width: 1, height: 1 };
  return {
    type: 'path',
    id: `logo-${glyph}`,
    z: `a${index}`,
    center: {
      x: ARTWORK_ORIGIN.x + (box.x + box.width / 2) * ARTWORK_SCALE,
      y: ARTWORK_ORIGIN.y + (box.y + box.height / 2) * ARTWORK_SCALE,
    },
    size: { width: box.width * ARTWORK_SCALE, height: box.height * ARTWORK_SCALE },
    d,
    viewBox: box,
    // `COLORS.main`: the mark is pure white, brighter than the theme's text.
    fill: '#FFFFFF',
  };
};

/** The logo's definition: a composite scene of the mark and the four letters. */
export const logoComposite = (): RenderList2D => {
  const nodes = DXOS_LOCKUP_GLYPHS.map(glyphNode);
  return {
    id: LOGO_OBJECT,
    name: 'DXOS logo',
    kind: 'composite',
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    links: {},
  };
};

const text = (
  id: string,
  z: string,
  value: string,
  center: Point,
  size: Size,
  fontSize: number,
  fontFamily?: 'monospace',
): NoteNode => ({
  type: 'note',
  id,
  z,
  center,
  size,
  text: value,
  style: {
    fill: false,
    border: false,
    fontSize,
    alignHorizontal: 'center',
    alignVertical: 'middle',
    ...(fontFamily ? { fontFamily } : {}),
  },
});

/**
 * Where the lines rest once they have arrived: each puts its glyphs' centre where the ident's frame has them (measured
 * from `DXOS_SI_END_3s_16x9_v02.mp4`), allowing for the theme's face sitting lower in its line than Sharp Sans.
 */
export const LAYOUT = {
  tagline: { x: 0, y: -26 },
  rule: { x: 0, y: 52.5 },
  cta: { x: 0, y: 306.5 },
  url: { x: 0, y: 370.5 },
};

/** The accent rule, 240x4 with round ends, as path data: a path node fills with its hue's colour at full strength. */
const RULE_PATH = 'M 2 0 L 238 0 Q 240 0 240 2 Q 240 4 238 4 L 2 4 Q 0 4 0 2 Q 0 0 2 0 Z';

/** The end card's root scene at rest: the logo instance, the tagline, the rule and the call to action. */
export const rootScene = (): RenderList2D => {
  const composite = logoComposite();
  const content = compositeBounds(composite) ?? { x: 0, y: 0, width: 0, height: 0 };
  const logo: InstanceNode = {
    type: 'instance',
    id: LOGO,
    z: 'a0',
    center: { x: content.x + content.width / 2, y: content.y + content.height / 2 },
    size: { width: content.width, height: content.height },
    composite: LOGO_OBJECT,
    ports: instancePorts(content, composite),
    // Its parts' region, so the placed logo is an origin and a scale, which the shot's keys scale it by.
    frame: content,
  };
  const rule: PathNode = {
    type: 'path',
    id: 'rule',
    z: 'a2',
    center: LAYOUT.rule,
    size: { width: 240, height: 4 },
    d: RULE_PATH,
    viewBox: { x: 0, y: 0, width: 240, height: 4 },
    // `COLORS.accent`, used once per spot.
    fill: '#5B8CFF',
  };
  const nodes: Node[] = [
    logo,
    text('tagline', 'a1', 'Sovereign Intelligence.', LAYOUT.tagline, { width: 1024, height: 96 }, 64),
    rule,
    text('cta', 'a3', 'Join the community', LAYOUT.cta, { width: 640, height: 64 }, 40),
    text('url', 'a4', 'dxos.org/discord', LAYOUT.url, { width: 640, height: 64 }, 40, 'monospace'),
  ];
  return {
    id: ROOT,
    name: 'End card',
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    links: {},
  };
};

/** The end card at rest, as a scene document over the root scene, with the logo's parts as its object's layout. */
export const endCardDocument = (): Scene.SceneDocument =>
  fromRenderLists2D([rootScene(), logoComposite()], { root: ROOT, theme: 'film' });

/** One key of the end card's shot, on an element's field. */
export type KeySpec = { target: string; property: string; t: number; value: unknown; easing?: Easing };

/** The path of an element's own opacity. */
const OPACITY = 'overrides.opacity';

/** The logo's origin at rest: where its parts' own origin is placed, which the shot scales about the scale origin. */
const logoRest = (): Point => {
  const layout = findLayout(endCardDocument(), ROOT);
  return layout?.dim === '2d' ? (layout.elements[LOGO]?.center ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
};

/** The logo's placement at scale `scale` about the scale origin: its centre moves as its size scales. */
export const logoAt = (scale: number, rest: Point = logoRest()): { center: Point; scale: Point } => ({
  center: {
    x: SCALE_ORIGIN.x + (rest.x - SCALE_ORIGIN.x) * scale,
    y: SCALE_ORIGIN.y + (rest.y - SCALE_ORIGIN.y) * scale,
  },
  scale: { x: scale, y: scale },
});

/** A fade and a rise of `rise` scene units from `from` to `to` seconds, as `EndCard` gives each line. */
const entrance = (target: string, rest: Point, from: number, to: number, rise: number, opacity = 1): KeySpec[] => [
  { target, property: OPACITY, t: from, value: 0 },
  { target, property: OPACITY, t: to, value: opacity, easing: OUT },
  { target, property: 'center', t: from, value: { x: rest.x, y: rest.y + rise } },
  { target, property: 'center', t: to, value: rest, easing: OUT },
];

/**
 * `EndCard`'s beats as keys: the mark fades in over 0.3 s and overshoots from 90% to full size by 0.6 s, then breathes
 * to 101.2% by the end; the tagline rises 24 px into view from 0.55 to 0.95 s; the rule draws out from its centre from
 * 0.85 to 1.25 s; the call to action rises 18 px from 1.05 to 1.45 s. Its grey (#B8B8B8 on near-black) is white at
 * 72%.
 */
export const endCardKeys = (): KeySpec[] => {
  const scales: [number, number, Easing | undefined][] = [
    [0, 0.9, undefined],
    [0.6, 1, BACK_OUT],
    [DURATION, 1.012, 'linear'],
  ];
  const rest = logoRest();
  return [
    { target: LOGO, property: OPACITY, t: 0, value: 0 },
    { target: LOGO, property: OPACITY, t: 0.3, value: 1, easing: OUT },
    ...scales.flatMap(([t, scale, easing]): KeySpec[] => {
      const placement = logoAt(scale, rest);
      return [
        { target: LOGO, property: 'center', t, value: placement.center, ...(easing ? { easing } : {}) },
        { target: LOGO, property: 'scale', t, value: placement.scale, ...(easing ? { easing } : {}) },
      ];
    }),
    ...entrance('tagline', LAYOUT.tagline, 0.55, 0.95, 24),
    { target: 'rule', property: 'size', t: 0.85, value: { width: 0, height: 4 } },
    { target: 'rule', property: 'size', t: 1.25, value: { width: 240, height: 4 }, easing: OUT },
    ...entrance('cta', LAYOUT.cta, 1.05, 1.45, 18, 0.72),
    ...entrance('url', LAYOUT.url, 1.05, 1.45, 18),
  ];
};

/** Every entrance keyed, as an animator shot over the end card holds them: a drawing stores no timeline (F-2.3). */
export const endCardShot = (): Timeline =>
  endCardKeys().reduce(
    (timeline, { target, property, t, value, easing }) =>
      setKey(timeline, target, property, { t, value, ...(easing !== undefined ? { easing } : {}) }),
    createTimeline(DURATION),
  );
