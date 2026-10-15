//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, type MdlMap, type MdlValue } from '@dxos/deus/parser';

import { parseDuration, parseRate } from './units.ts';

export type Ease = 'linear' | 'in' | 'out' | 'in-out';
export type ViewSpec = { tilt: number; spin: number };
export type CameraSpec = {
  view?: ViewSpec;
  focus?: string;
  fit?: string;
  follow?: string;
  zoom?: number;
  path?: CameraSpec[];
  over: number;
  ease: Ease;
};
export type ShowSpec = { target: string; transition: 'grow' | 'fade' | 'none'; stagger: number; exact: boolean };
export type SetSpec = { selector: string; prop: string; value: string | number | boolean };
export type SendSpec = {
  from: string;
  to: string;
  rate?: number;
  count?: number;
  color?: string;
  until?: number;
  speed: number;
};
export type TrafficSpec = { scope: string; rate: number; until?: number; speed: number };
export type FlowStep = {
  name: string;
  with: boolean;
  at?: number;
  hold: number;
  camera?: CameraSpec;
  show: ShowSpec[];
  hide: ShowSpec[];
  set: SetSpec[];
  send: SendSpec[];
  traffic: TrafficSpec[];
  caption?: string;
  narration?: string;
  mark?: string;
};
export type FlowScript = { id: string; title?: string; seed?: number; steps: FlowStep[] };
export type Diagnostic = { severity: 'error' | 'warning'; message: string; step?: string; line?: number };

export const VIEWS = { iso: { tilt: 55, spin: -35 }, top: { tilt: 0, spin: 0 } } as const satisfies Record<
  string,
  ViewSpec
>;
export const APPS = ['chat', 'editor', 'sheet', 'table', 'kanban', 'call'] as const;

const DEFAULT_OVER = 1000;
const DEFAULT_SPEED = 1500;
const STEP_KEYS = new Set([
  'name',
  'with',
  'at',
  'hold',
  'camera',
  'show',
  'hide',
  'set',
  'send',
  'traffic',
  'caption',
  'narration',
  'mark',
]);
const CAMERA_KEYS = new Set(['view', 'focus', 'fit', 'follow', 'zoom', 'path', 'over', 'ease']);
const EASES: readonly Ease[] = ['linear', 'in', 'out', 'in-out'];
const TRANSITIONS: readonly ShowSpec['transition'][] = ['grow', 'fade', 'none'];

type Report = (message: string) => void;

const isMap = (value: MdlValue | undefined): value is MdlMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isEase = (value: unknown): value is Ease => EASES.some((ease) => ease === value);
const isTransition = (value: unknown): value is ShowSpec['transition'] =>
  TRANSITIONS.some((transition) => transition === value);
const asList = (value: MdlValue): MdlValue[] => (Array.isArray(value) ? value : [value]);

const duration = (value: MdlValue, field: string, report: Report): number | undefined => {
  const ms = parseDuration(value);
  if (ms === undefined) {
    report(`"${field}" must be a duration like 2s, 200ms or 1m20s`);
  }
  return ms;
};

const readCamera = (value: MdlValue, report: Report, topLevel: boolean): CameraSpec | undefined => {
  if (!isMap(value)) {
    report('"camera" takes a map, e.g. { view: iso, fit: home }');
    return undefined;
  }
  for (const key of Object.keys(value)) {
    if (!CAMERA_KEYS.has(key)) {
      report(`Unknown camera field "${key}"`);
    }
  }
  const spec: CameraSpec = { over: DEFAULT_OVER, ease: 'in-out' };
  const { view } = value;
  if (view !== undefined) {
    if (view === 'iso' || view === 'top') {
      spec.view = { ...VIEWS[view] };
    } else if (isMap(view) && typeof view.tilt === 'number' && typeof view.spin === 'number') {
      spec.view = { tilt: view.tilt, spin: view.spin };
    } else {
      report('"view" is iso, top, or { tilt, spin }');
    }
  }
  for (const key of ['focus', 'fit', 'follow'] as const) {
    const selector = value[key];
    if (selector !== undefined) {
      if (typeof selector === 'string') {
        spec[key] = selector;
      } else {
        report(`"${key}" takes a selector`);
      }
    }
  }
  if (value.zoom !== undefined) {
    if (typeof value.zoom === 'number' && value.zoom > 0) {
      spec.zoom = value.zoom;
    } else {
      report('"zoom" must be a positive number');
    }
  }
  if (value.over !== undefined) {
    spec.over = duration(value.over, 'over', report) ?? DEFAULT_OVER;
  }
  if (value.ease !== undefined) {
    if (isEase(value.ease)) {
      spec.ease = value.ease;
    } else {
      report(`"ease" is one of ${EASES.join(', ')}`);
    }
  }
  if (value.path !== undefined) {
    if (topLevel && Array.isArray(value.path)) {
      spec.path = value.path
        .map((key) => readCamera(key, report, false))
        .filter((key): key is CameraSpec => key !== undefined);
    } else {
      report('"path" is a list of keyframes at the top level of "camera"');
    }
  }
  if (spec.focus !== undefined && spec.fit !== undefined) {
    report('"camera" takes "focus" or "fit", not both');
  }
  if (spec.path !== undefined && (spec.focus !== undefined || spec.fit !== undefined || spec.zoom !== undefined)) {
    report('"camera" takes "path" or "focus"/"fit"/"zoom", not both');
  }
  return spec;
};

const readShow = (value: MdlValue, verb: string, report: Report): ShowSpec[] =>
  asList(value).flatMap((item): ShowSpec[] => {
    if (typeof item === 'string') {
      return [{ target: item, transition: 'grow', stagger: 0, exact: false }];
    }
    if (!isMap(item) || typeof item.target !== 'string') {
      report(`"${verb}" takes a selector or { target, transition, stagger, exact }`);
      return [];
    }
    const spec: ShowSpec = { target: item.target, transition: 'grow', stagger: 0, exact: item.exact === true };
    if (item.transition !== undefined) {
      if (isTransition(item.transition)) {
        spec.transition = item.transition;
      } else {
        report(`"transition" is one of ${TRANSITIONS.join(', ')}`);
      }
    }
    if (item.stagger !== undefined) {
      spec.stagger = duration(item.stagger, 'stagger', report) ?? 0;
    }
    return [spec];
  });

const readSet = (value: MdlValue, report: Report): SetSpec[] => {
  if (!isMap(value)) {
    report('"set" takes a map of { <selector>.<property>: value }');
    return [];
  }
  return Object.entries(value).flatMap(([key, propValue]): SetSpec[] => {
    const dot = key.lastIndexOf('.');
    if (dot <= 0 || dot === key.length - 1) {
      report(`"set" keys are <selector>.<property>, got "${key}"`);
      return [];
    }
    if (typeof propValue !== 'string' && typeof propValue !== 'number' && typeof propValue !== 'boolean') {
      report(`"${key}" must be a string, number or boolean`);
      return [];
    }
    const prop = key.slice(dot + 1);
    if (prop === 'app' && !APPS.some((app) => app === propValue)) {
      report(`"app" must be one of ${APPS.join(', ')}`);
      return [];
    }
    return [{ selector: key.slice(0, dot), prop, value: propValue }];
  });
};

const readColor = (item: MdlMap, report: Report): string | undefined => {
  if (item.color === undefined) {
    return undefined;
  }
  if (typeof item.color === 'string' && item.color !== '') {
    return item.color;
  }
  report('"color" must be a quoted string such as \'#5f8fae\' (an unquoted # starts a comment)');
  return undefined;
};

const readSpeed = (item: MdlMap, report: Report): number => {
  if (item.speed === undefined) {
    return DEFAULT_SPEED;
  }
  if (typeof item.speed === 'number' && item.speed > 0) {
    return item.speed;
  }
  report('"speed" must be a positive number of world units per second');
  return DEFAULT_SPEED;
};

const readSend = (value: MdlValue, report: Report): SendSpec[] =>
  asList(value).flatMap((item): SendSpec[] => {
    if (!isMap(item) || typeof item.from !== 'string' || typeof item.to !== 'string') {
      report('"send" takes { from, to, rate | count }');
      return [];
    }
    const spec: SendSpec = { from: item.from, to: item.to, speed: readSpeed(item, report) };
    if (item.rate !== undefined) {
      const rate = parseRate(item.rate);
      if (rate === undefined) {
        report('"rate" must look like 2/s or 30/m');
      } else {
        spec.rate = rate;
      }
    }
    if (item.count !== undefined) {
      if (typeof item.count === 'number' && Number.isInteger(item.count) && item.count > 0) {
        spec.count = item.count;
      } else {
        report('"count" must be a positive integer');
      }
    }
    if (spec.rate === undefined && spec.count === undefined) {
      report('"send" needs "rate" or "count"');
    }
    const color = readColor(item, report);
    if (color !== undefined) {
      spec.color = color;
    }
    if (item.until !== undefined) {
      spec.until = duration(item.until, 'until', report);
    }
    return [spec];
  });

const readTraffic = (value: MdlValue, report: Report): TrafficSpec[] =>
  asList(value).flatMap((item): TrafficSpec[] => {
    if (!isMap(item)) {
      report('"traffic" takes { scope, rate }');
      return [];
    }
    const rate = parseRate(item.rate);
    if (rate === undefined) {
      report('"traffic" needs a "rate" like 4/s');
      return [];
    }
    const spec: TrafficSpec = {
      scope: typeof item.scope === 'string' ? item.scope : '**',
      rate,
      speed: readSpeed(item, report),
    };
    if (item.until !== undefined) {
      spec.until = duration(item.until, 'until', report);
    }
    return [spec];
  });

const readText = (value: MdlValue, verb: string, report: Report): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  report(`"${verb}" takes text`);
  return undefined;
};

/** Reads a flow block into typed steps; problems become diagnostics rather than exceptions. */
export const readFlow = (block: MdlBlock): { flow: FlowScript; diagnostics: Diagnostic[] } => {
  const diagnostics: Diagnostic[] = [];
  const raw = block.fields.steps;
  if (!Array.isArray(raw) || raw.length === 0) {
    diagnostics.push({ severity: 'error', message: 'A flow needs a non-empty "steps:" list' });
  }
  const steps = (Array.isArray(raw) ? raw : []).flatMap((item, index): FlowStep[] => {
    const name = isMap(item) && typeof item.name === 'string' ? item.name : `Step ${index + 1}`;
    const report: Report = (message) => diagnostics.push({ severity: 'error', message, step: name });
    if (!isMap(item)) {
      report('A step is a map of verbs');
      return [];
    }
    for (const key of Object.keys(item)) {
      if (!STEP_KEYS.has(key)) {
        report(`Unknown verb "${key}"`);
      }
    }
    const step: FlowStep = { name, with: false, hold: 0, show: [], hide: [], set: [], send: [], traffic: [] };
    if (item.with !== undefined) {
      if (item.with !== 'previous') {
        report('"with" only accepts "previous"');
      } else if (index === 0) {
        report('The first step cannot run "with: previous"');
      } else {
        step.with = true;
      }
    }
    if (item.at !== undefined) {
      step.at = duration(item.at, 'at', report);
    }
    if (item.hold !== undefined) {
      step.hold = duration(item.hold, 'hold', report) ?? 0;
    }
    if (item.camera !== undefined) {
      step.camera = readCamera(item.camera, report, true);
    }
    if (item.show !== undefined) {
      step.show = readShow(item.show, 'show', report);
    }
    if (item.hide !== undefined) {
      step.hide = readShow(item.hide, 'hide', report);
    }
    if (item.set !== undefined) {
      step.set = readSet(item.set, report);
    }
    if (item.send !== undefined) {
      step.send = readSend(item.send, report);
    }
    if (item.traffic !== undefined) {
      step.traffic = readTraffic(item.traffic, report);
    }
    for (const verb of ['caption', 'narration', 'mark'] as const) {
      const value = item[verb];
      if (value !== undefined) {
        step[verb] = readText(value, verb, report);
      }
    }
    return [step];
  });
  const seed = typeof block.fields.seed === 'number' ? block.fields.seed : undefined;
  return { flow: { id: block.id ?? '', title: block.title, seed, steps }, diagnostics };
};
