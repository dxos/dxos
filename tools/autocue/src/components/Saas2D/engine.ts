//
// Copyright 2026 DXOS.org
//

// The 2D scene engine: each slide returns the primitives on screen at a time within it, in world coordinates under a
// camera, and the engine blends one slide into the next by primitive id, so the story's elements move as wholes.

import { type Role } from './tokens.ts';

/** Fields shared by every primitive; `screen` primitives are placed in screen pixels, ignoring the camera. */
type Base = {
  id: string;
  opacity?: number;
  /** Seconds after the slide starts before an entering primitive begins to fade in; it still arrives as the cut ends. */
  delay?: number;
  /** How an element leaving with nowhere to go goes: it shrinks where it is (the default) or only fades. */
  exit?: 'fade';
  screen?: boolean;
  /**
   * Key (`kind:id`) of the element this one belongs to in the story's hierarchy (a team to its company, a company's data
   * to the vendor holding it). An element that enters grows out of its parent's previous place; one that leaves folds
   * into its parent's next place.
   */
  parent?: string;
  /** Key of the element this one becomes or grows out of across a cut (the SaaS vendor becoming the apps). */
  from?: string;
};

/** A soft container (company, vendor, lab, space): raised disc with an inset well; `role` names what it is, not its color. */
export type BodyPrim = Base & {
  kind: 'body';
  x: number;
  y: number;
  r: number;
  role?: Role;
  /** The inset well's radius as a share of the body's; a smaller well makes a broader raised band. */
  well?: number;
};
/** A lit disc in a role color (or `color`), glowing. */
export type NodePrim = Base & {
  kind: 'node';
  x: number;
  y: number;
  r: number;
  role?: Role;
  color?: string;
  glow?: number;
};
/** A raised chip with an accent dot: an app. */
export type ChipPrim = Base & { kind: 'chip'; x: number; y: number; text: string; scale?: number };
/** A dotted orbit, drawn face-on. */
/** A dotted orbit, or with `color` a solid colored ring (an app). */
export type RingPrim = Base & { kind: 'ring'; x: number; y: number; r: number; color?: string };
/** The elements a link or flow joins (`kind:id` keys): its ends follow them every frame, clipped to their rims. */
type Ends = { a?: string; b?: string };

/** A thin link; `hot` turns it accent. `progress` draws it from its first end. */
export type LinkPrim = Base &
  Ends & {
    kind: 'link';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    hot?: boolean;
    color?: string;
    progress?: number;
    /** The second end is in screen pixels (a link from a world object to a card). */
    screen2?: boolean;
  };
/** Dots travelling from the first end to the second; `phase` advances one unit per trip. */
export type FlowPrim = Base &
  Ends & {
    kind: 'flow';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    phase: number;
    color: string;
    count?: number;
    size?: number;
  };
/** A single-line label; `size` is in screen pixels whatever the zoom. */
export type LabelPrim = Base & {
  kind: 'label';
  x: number;
  y: number;
  text: string;
  size?: number;
  weight?: number;
  color?: string;
  mono?: boolean;
  /** Set in the DXOS logotype face (Sharp Sans), to sit with the wordmark. */
  logotype?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  /** No dark halo: for labels on a light field. */
  plain?: boolean;
  /** Stretches the letter spacing to this width (pixels), to match a heading above. */
  width?: number;
};
/** A large heading, screen-centred by default. */
export type TitlePrim = Base & { kind: 'title'; x: number; y: number; text: string; size?: number; color?: string };
/** A full-frame fill (curtain or field). */
export type FillPrim = Base & { kind: 'fill'; color: string };
/** The DXOS logotype. */
/** The DXOS lockup, or with `src` another logo (a file in public/, `aspect` its width over its height). */
export type LogoPrim = Base & {
  kind: 'logo';
  x: number;
  y: number;
  width: number;
  dark?: boolean;
  src?: string;
  aspect?: number;
};

/** A row of a card thread. */
export type Message = { who: string; color: string; text: string; bot?: boolean; at: number };

/** A Composer-style object card, in screen pixels; messages appear at their `at` (slide seconds). */
export type CardPrim = Base & {
  kind: 'card';
  x: number;
  y: number;
  width: number;
  type: string;
  title: string;
  rows: [string, string][];
  thread?: Message[];
  accent?: boolean;
  /** Slide seconds, for the thread's appearance. */
  now: number;
};

export type Prim =
  | BodyPrim
  | NodePrim
  | ChipPrim
  | RingPrim
  | LinkPrim
  | FlowPrim
  | LabelPrim
  | TitlePrim
  | FillPrim
  | LogoPrim
  | CardPrim;

export type PrimKind = Prim['kind'];

/** Back to front; a fill covers the scene but not the text set on it. */
export const LAYERS: PrimKind[] = ['body', 'ring', 'link', 'flow', 'node', 'chip', 'fill', 'label', 'title', 'logo'];

/** World point at the screen centre, and screen pixels per world unit. */
export type Camera = { x: number; y: number; zoom: number };

export type Frame = { camera: Camera; prims: Prim[] };

export type Slide = {
  id: string;
  /** Seconds the blend from the previous slide takes. */
  transition?: number;
  /**
   * The frame `t` seconds into the slide's keyframes; `real` is the seconds actually played, which differ when the
   * slide is sped up to fit the story, so steady motion (data flowing) keeps its pace.
   */
  draw: (t: number, real?: number) => Frame;
};

export const TRANSITION = 1.25;

/** The design system's ease, cubic-bezier(0.22, 1, 0.36, 1), solved for x. */
export const ease = (x: number) => {
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const bezier = (t: number, p1: number, p2: number) => 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, x1, x2) < x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return bezier((lo + hi) / 2, y1, y2);
};

/** A symmetric ease for moves that should start as gently as they land (scene-long motion). */
export const easeInOut = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);

/** A gentle symmetric ease for scene morphs: the change is spread across the whole transition. */
export const easeMorph = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - Math.cos(Math.PI * x) / 2);

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** 0 before `start`, eased to 1 over `seconds`. */
export const ramp = (t: number, start: number, seconds: number, curve = ease) => curve(clamp((t - start) / seconds));

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const key = (prim: Prim) => `${prim.kind}:${prim.id}`;

/** Numeric fields interpolate; everything else is taken from the slide being entered. */
const blend = <P extends Prim>(from: P, to: P, k: number): P => {
  const source: Record<string, unknown> = from;
  const numbers: Record<string, number> = {};
  for (const [name, value] of Object.entries(to)) {
    const previous = source[name];
    // A flow's phase and a card's clock run on their own time, so they are never blended.
    if (typeof value === 'number' && typeof previous === 'number' && name !== 'now' && name !== 'phase') {
      numbers[name] = lerp(previous, value, k);
    }
  }
  numbers.opacity = lerp(from.opacity ?? 1, to.opacity ?? 1, k);
  return Object.assign({}, to, numbers);
};

/** Fades a primitive by `k` (1 = fully shown); discs also grow from 60% as they appear. */
const fade = (prim: Prim, k: number): Prim => {
  const opacity = (prim.opacity ?? 1) * k;
  if (prim.kind === 'body' || prim.kind === 'node' || prim.kind === 'ring') {
    return { ...prim, opacity, r: prim.r * (0.6 + 0.4 * k) };
  }
  return { ...prim, opacity };
};

const blendCamera = (a: Camera, b: Camera, k: number): Camera => {
  const zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), k));
  // The centre moves in step with the zoom's progress in log space, so a dive heads straight for its target.
  const z = a.zoom === b.zoom ? k : (1 / a.zoom - 1 / zoom) / (1 / a.zoom - 1 / b.zoom);
  return { x: lerp(a.x, b.x, z), y: lerp(a.y, b.y, z), zoom };
};

/** A primitive's place in world (or screen) units, or nothing for full-frame primitives. */
const anchor = (prim: Prim): [number, number] | undefined => {
  switch (prim.kind) {
    case 'link':
    case 'flow':
      return [(prim.x1 + prim.x2) / 2, (prim.y1 + prim.y2) / 2];
    case 'fill':
      return undefined;
    default:
      return [prim.x, prim.y];
  }
};

/** `prim` moved so that it starts at `[x, y]` and reaches its own place as `k` goes from 0 to 1. */
const travel = (prim: Prim, [x, y]: [number, number], k: number): Prim => {
  switch (prim.kind) {
    case 'link':
    case 'flow':
      return {
        ...prim,
        x1: lerp(x, prim.x1, k),
        y1: lerp(y, prim.y1, k),
        x2: lerp(x, prim.x2, k),
        y2: lerp(y, prim.y2, k),
      };
    case 'fill':
      return prim;
    default:
      return { ...prim, x: lerp(x, prim.x, k), y: lerp(y, prim.y, k) };
  }
};

/** Shrinks a disc or chip toward nothing as `k` goes to 0, so what folds into a parent does not cover it. */
const grow = (prim: Prim, k: number): Prim => {
  const size = 0.15 + 0.85 * k;
  switch (prim.kind) {
    case 'body':
    case 'node':
    case 'ring':
      return { ...prim, r: prim.r * size };
    case 'chip':
      return { ...prim, scale: (prim.scale ?? 1) * size };
    default:
      return prim;
  }
};

/** The frame `t` seconds into a blend of `seconds` from `from` to `to`. */
export const mix = (from: Frame, to: Frame, t: number, seconds: number): Frame => {
  // The design system's ease-out suits short cuts; a long morph would land in its first third, so it eases both ends.
  const curve = seconds >= 2 ? easeMorph : ease;
  const k = curve(t / seconds);
  const before = new Map(from.prims.map((prim) => [key(prim), prim]));
  const after = new Map(to.prims.map((prim) => [key(prim), prim]));
  // Elements of `from` that become another element of `to`: the first element naming each as its source.
  const becomes = new Map<string, Prim>();
  for (const prim of to.prims) {
    if (prim.from && !becomes.has(prim.from)) {
      becomes.set(prim.from, prim);
    }
  }
  /** Where a leaving element's lineage lands in `to`: its own successor, else its parent's (followed up the tree). */
  const destination = (prim: Prim, depth = 0): [number, number] | undefined => {
    const next = becomes.get(key(prim));
    if (next) {
      return anchor(next);
    }
    if (!prim.parent || depth > 8) {
      return undefined;
    }
    const parent = after.get(prim.parent);
    if (parent) {
      return anchor(parent);
    }
    const old = before.get(prim.parent);
    return old ? destination(old, depth + 1) : undefined;
  };
  /** Where an entering element's lineage was in `from`: its source, else its parent (or the parent's source). */
  const origin = (prim: Prim, depth = 0): [number, number] | undefined => {
    const source = prim.from ? before.get(prim.from) : undefined;
    if (source) {
      return anchor(source);
    }
    // A source that enters with this element is where it emerges once that source is in place (with a `delay`).
    const sibling = prim.from ? after.get(prim.from) : undefined;
    if (sibling) {
      return anchor(sibling);
    }
    if (!prim.parent || depth > 8) {
      return undefined;
    }
    const parent = before.get(prim.parent);
    if (parent) {
      return anchor(parent);
    }
    const next = after.get(prim.parent);
    return next ? origin(next, depth + 1) : undefined;
  };

  const prims: Prim[] = [];
  for (const prim of to.prims) {
    const previous = before.get(key(prim));
    const own = curve((t - (prim.delay ?? 0)) / Math.max(0.1, seconds - (prim.delay ?? 0)));
    if (previous) {
      prims.push(blend(previous, prim, own));
      continue;
    }
    const start = prim.screen ? undefined : origin(prim);
    prims.push(
      start ? travel(grow({ ...prim, opacity: (prim.opacity ?? 1) * own }, own), start, own) : fade(prim, own),
    );
  }
  for (const prim of from.prims) {
    if (after.has(key(prim))) {
      continue;
    }
    const end = prim.screen ? undefined : destination(prim);
    // A leaving element moves from its own place (1 - k = 1) to its destination (1 - k = 0), or shrinks where it is.
    prims.push(
      end
        ? travel(grow({ ...prim, opacity: (prim.opacity ?? 1) * (1 - k) }, 1 - k), end, 1 - k)
        : prim.exit === 'fade'
          ? { ...prim, opacity: (prim.opacity ?? 1) * (1 - k) }
          : grow({ ...prim, opacity: (prim.opacity ?? 1) * (1 - k) }, 1 - k),
    );
  }
  return { camera: blendCamera(from.camera, to.camera, k), prims };
};

const rim = (prim: Prim | undefined) =>
  prim && (prim.kind === 'body' || prim.kind === 'node' || prim.kind === 'ring') ? prim.r : 0;

/**
 * Puts the ends of every bound link and flow on the elements it joins, as they are in this frame (mid-morph too), and
 * fades it with them; a link whose ends overlap is hidden, since one element then holds the other.
 */
export const bind = (frame: Frame): Frame => {
  const byKey = new Map(frame.prims.map((prim) => [key(prim), prim]));
  const prims = frame.prims.map((prim): Prim => {
    if ((prim.kind !== 'link' && prim.kind !== 'flow') || (!prim.a && !prim.b)) {
      return prim;
    }
    const a = prim.a ? byKey.get(prim.a) : undefined;
    const b = prim.b ? byKey.get(prim.b) : undefined;
    const [ax, ay] = (a && anchor(a)) ?? [prim.x1, prim.y1];
    const [bx, by] = (b && anchor(b)) ?? [prim.x2, prim.y2];
    const opacity = (prim.opacity ?? 1) * Math.min(a?.opacity ?? 1, b?.opacity ?? 1);
    // A link to a card has one end in screen pixels; its world end is not clipped.
    if (prim.kind === 'link' && prim.screen2) {
      return { ...prim, x1: ax, y1: ay, opacity };
    }
    const length = Math.hypot(bx - ax, by - ay);
    const [ra, rb] = [rim(a), rim(b)];
    if (length <= ra + rb + 1) {
      return { ...prim, opacity: 0 };
    }
    const [ux, uy] = [(bx - ax) / length, (by - ay) / length];
    return { ...prim, x1: ax + ux * ra, y1: ay + uy * ra, x2: bx - ux * rb, y2: by - uy * rb, opacity };
  });
  return { ...frame, prims };
};

/** A slide placed on the timeline. */
export type Placed = { slide: Slide; start: number; hold: number };

export const place = (slides: Slide[], holds: Record<string, number>): Placed[] => {
  let start = 0;
  return slides.map((slide) => {
    const hold = holds[slide.id];
    if (hold === undefined) {
      throw new Error(`no hold for slide ${slide.id}`);
    }
    const placed = { slide, start, hold };
    start += hold;
    return placed;
  });
};

/** The frame at `seconds` into the timeline. */
export const frameAt = (timeline: Placed[], seconds: number): Frame => {
  let index = 0;
  while (index + 1 < timeline.length && timeline[index + 1].start <= seconds) {
    index++;
  }
  const { slide, start } = timeline[index];
  const t = seconds - start;
  const transition = slide.transition ?? TRANSITION;
  if (index === 0 || t >= transition) {
    return bind(slide.draw(t));
  }
  const previous = timeline[index - 1];
  return bind(mix(previous.slide.draw(previous.hold + t), slide.draw(t), t, transition));
};
