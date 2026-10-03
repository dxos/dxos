//
// Copyright 2026 DXOS.org
//

// Agreement fixture: every declaration here is scored against `tsc` by `agreement.test.ts`.

import { type Remote, helper, makeBox, remoteObject, remoteValue } from './remote.ts';

export const one = 1;
export let widened = 1;
export const text = 'a';
export const template = `plain`;
export const interpolated = `a${one}`;
export const flag = true;
export const big = 10n;
export const negative = -1;
export const nothing = null;
export const object = { a: 1, b: 'x', nested: { c: true } };
export const constant = { a: 1, list: [1, 2] } as const;
export const list = [1, 2, 3];
export const mixed = [1, 'a'];
export const tuple = [1, 'a'] as const;
export const annotated: Record<string, number> = {};
export const union: string | number = 1;
export const optional: { a?: string; readonly b: number } = { b: 1 };
export const sum = one + 2;
export const concat = text + one;
export const compare = one > 2;
export const kind = typeof one;
export const choice = flag ? 1 : 'a';
declare const nullable: string | null;
export const coalesce = nullable ?? 1;
export const length = text.length;
export const property = object.nested;
export const deep = object.nested.c;
export const { a: destructured, b } = object;
export const [first] = tuple;
export const regex = /x/;
export const date = new Date();
export const map = new Map<string, number>();

export const arrow = (value: number) => value * 2;
export const arrowString = (value: number): string => String(value);
export const generic = <T>(value: T): T => value;
export const instantiated = generic(1);
export const box = <T>(value: T): { value: T } => ({ value });
export const boxed = box(1);
export const defaulted = (count = 1) => count;
export const rest = (...values: string[]) => values.length;
export const asyncArrow = async () => 1;
export const awaitedValue = async () => await asyncArrow();

export function declared(value: string, count?: number): number {
  return value.length + (count ?? 0);
}

export function inferred(value: string) {
  return value;
}

export function noReturn(value: string) {
  void value;
}

export const called = declared('a');

export type Alias = { readonly id: string };
export type Name = string;
export type Choice = 'a' | 'b';
export interface Shape {
  readonly kind: string;
}

export const alias: Alias = { id: 'x' };
export const name: Name = 'x';
export const choose: Choice = 'a';
export const shape: Shape = { kind: 'x' };
export const shapes: Shape[] = [];
export const readonlyShapes: readonly Shape[] = [];
export const pair: [string, number?] = ['a'];

export class Counter {
  static zero = 0;
  static readonly label = 'counter';
  count = 0;
}

export const counter = new Counter();
export const counterClass = Counter;

export const remote: Remote = helper();
export const remoteHelper = helper;
export const shadow = (() => {
  const one = 'shadowed';
  return one;
})();

export const loop = () => {
  for (const item of list) {
    const doubled = item * 2;
    void doubled;
  }
};

// Regressions found on the repo sample.

declare const maybe: string | (() => string);
export const narrowed = typeof maybe === 'function' ? maybe() : maybe;
declare const items: unknown;
export const guarded = Array.isArray(items) ? items : [];
export const assigned: string | undefined = 'a';
export const readAssigned = assigned;

export const exits = () => {
  process.exit(1);
};
export function throws(): void {
  throw new Error('x');
}
export const throwsArrow = () => {
  throw new Error('x');
};

export const awaitGeneric = async <T>(compute: () => Promise<T>) => {
  const next = await compute();
  return next;
};

export const destructuredDefault = ({ depth = 0 } = {}) => depth;

export type Details = Record<string, number | undefined>;
export const details: Details = {};
export type Choices = Choice | undefined;
export const choices: Choices = undefined;
export const optionalChoice: Choice | undefined = undefined;

// Cross-file: deferred here, bound by the cross-file pass.

export const fromRemote = remoteValue;
export let widenedRemote = remoteValue;
export const calledRemote = helper();
export const remoteCount = remoteObject.count;
export const boxedRemote = makeBox('a');
