//
// Copyright 2026 DXOS.org
//

// The results map's pure parts, ported from lighthouse `web/src/components/ResultsMap.tsx` and `SessionView.tsx`:
// pins from results, their colour, clustering on a pixel grid, lasso simplification, area names and the cards' area
// notes. Coordinates are read only through `locationOf`.

import {
  type AreaOverride,
  type AreaShape,
  DEFAULT_SOFT_M,
  type Rateable,
  type Rating,
  areaFit,
  locationOf,
} from '../../model/rating.ts';

/**
 * A located result on the map. `landmark`: a located result the model does not rate (a metro station the agent
 * looked up), drawn small and grey and not counted.
 */
export type Pin = {
  id: string;
  lat: number;
  lng: number;
  precisionM?: number;
  score?: number;
  /** The best fit over the drawn areas (1 inside, falling over the soft edge); absent with no areas. */
  fit?: number;
  title: string;
  detail: string;
  landmark?: boolean;
};

export type PinText = { title: string; detail: string };

/** Metres as a short label: `400 m`, `1.2 km`. */
export const metres = (value: number): string =>
  value >= 1000 ? `${Math.round(value / 100) / 10} km` : `${Math.round(value)} m`;

/** Red (worst) through amber to green (best), by the score's place between the lowest and highest shown. */
export const hueOf = (score: number | undefined, lo: number, hi: number): number | undefined =>
  score === undefined ? undefined : Math.round(8 + 122 * (hi > lo ? (score - lo) / (hi - lo) : 1));

/** A pin's colour: its score's hue, or grey for no score. */
export const colourOf = (hue?: number): string => (hue === undefined ? '#8a8a8a' : `hsl(${hue} 70% 42%)`);

/** An area with its soft edge resolved, as the rating reads it. */
const withSoft = (area: AreaOverride) => ({ ...area, softM: area.softM ?? DEFAULT_SOFT_M });

/** The pins: one per located result, scored and fitted against the drawn areas. */
export const toPins = <T extends Rateable>(
  items: ReadonlyArray<T>,
  ratings: ReadonlyMap<string, Rating> | undefined,
  areas: ReadonlyArray<AreaOverride>,
  describe: (item: T) => PinText,
): Pin[] => {
  const drawn = areas.map(withSoft);
  return items.flatMap((item): Pin[] => {
    const point = locationOf(item);
    if (!point) {
      return [];
    }
    const rating = ratings?.get(item.id);
    const landmark = !!rating?.missed.includes('not in scope');
    const fit = drawn.length ? Math.max(0, ...drawn.map((area) => areaFit(point, area))) : undefined;
    return [
      {
        id: item.id,
        lat: point.lat,
        lng: point.lng,
        ...(point.precisionM !== undefined ? { precisionM: point.precisionM } : {}),
        ...(landmark ? { landmark } : { score: rating?.score, fit }),
        ...describe(item),
      },
    ];
  });
};

/** Groups pins whose projected pixels share a cell of `size` px; at `exact` they stay apart. */
export const clusterPins = <P extends { id: string }>(
  pins: ReadonlyArray<P>,
  project: (pin: P) => { x: number; y: number },
  { size = 44, exact = false }: { size?: number; exact?: boolean } = {},
): P[][] => {
  const cells = new Map<string, P[]>();
  for (const pin of pins) {
    const { x, y } = project(pin);
    const key = exact ? pin.id : `${Math.floor(x / size)}:${Math.floor(y / size)}`;
    const cell = cells.get(key);
    if (cell) {
      cell.push(pin);
    } else {
      cells.set(key, [pin]);
    }
  }
  return [...cells.values()];
};

type XY = { x: number; y: number };

const segmentDistance = (p: XY, a: XY, b: XY): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/** Douglas–Peucker in screen pixels: a lasso of hundreds of pointer samples becomes a few dozen corners. */
export const simplify = <P extends XY>(points: ReadonlyArray<P>, tolerance: number): P[] => {
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length < 3 || !first || !last) {
    return [...points];
  }
  let max = 0;
  let at = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index];
    const distance = point ? segmentDistance(point, first, last) : 0;
    if (distance > max) {
      max = distance;
      at = index;
    }
  }
  if (max <= tolerance) {
    return [first, last];
  }
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
};

/** A name for a new area from where it is: the neighbourhood most of the results inside it share. */
export const nameFor = (shape: AreaShape, items: ReadonlyArray<Rateable>, index: number): string => {
  const area = { id: 'draft', label: 'draft', shape, softM: 0 };
  const counts = new Map<string, number>();
  for (const item of items) {
    const point = locationOf(item);
    const hood = item.props['lh:neighbourhood']?.[0] ?? item.props['lh:district']?.[0];
    if (point && typeof hood === 'string' && areaFit(point, area) === 1) {
      counts.set(hood, (counts.get(hood) ?? 0) + 1);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ? (shape.type === 'Circle' ? `Around ${best}` : best) : `Area ${index}`;
};

/** How many pins lie inside an area's hard edge (the chip's count). */
export const countInside = (pins: ReadonlyArray<Pin>, area: AreaOverride): number =>
  pins.filter((pin) => !pin.landmark && areaFit(pin, { ...area, softM: 0 }) === 1).length;

/**
 * A card's note while areas are drawn: `outside` beyond every area's soft edge (the card dims), `no-location` when
 * the result has no point to place; nothing with no areas or inside one.
 */
export const areaNoteOf = (
  item: Rateable,
  areas: ReadonlyArray<AreaOverride> | undefined,
): 'outside' | 'no-location' | undefined => {
  if (!areas?.length) {
    return undefined;
  }
  const point = locationOf(item);
  if (!point) {
    return 'no-location';
  }
  return Math.max(0, ...areas.map((area) => areaFit(point, withSoft(area)))) > 0 ? undefined : 'outside';
};

/** The map's summary line: rated pins, landmarks, inside/near counts and results with no location. */
export const summarize = (pins: ReadonlyArray<Pin>, total: number) => {
  const rated = pins.filter((pin) => !pin.landmark);
  const landmarks = pins.length - rated.length;
  return {
    rated: rated.length,
    landmarks,
    ratable: total - landmarks,
    inside: rated.filter((pin) => pin.fit === 1).length,
    near: rated.filter((pin) => pin.fit !== undefined && pin.fit > 0 && pin.fit < 1).length,
    unlocated: total - pins.length,
  };
};
