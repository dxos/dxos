//
// Copyright 2026 DXOS.org
//

// Automerge's op ids and change shape, shared by the model, the encoder and the worker.

/** An Automerge op id: counter, then actor. */
export type OpId = readonly [counter: number, actor: string];

/** An op as `A.decodeChange` returns it, which is also what `A.encodeChange` takes. */
export type DecodedOp = {
  action: string;
  obj: string;
  key?: string;
  elemId?: string;
  insert?: boolean;
  value?: unknown;
  datatype?: string;
  pred: string[];
};

/** A change as `A.decodeChange` returns it. */
export type Change = {
  actor: string;
  seq: number;
  startOp: number;
  time: number;
  message: string | null;
  deps: string[];
  hash: string;
  ops: DecodedOp[];
};

export type Clock = ReadonlyMap<string, number>;

export const parseId = (key: string): OpId => {
  const at = key.indexOf('@');
  return [Number(key.slice(0, at)), key.slice(at + 1)];
};

export const formatId = ([counter, actor]: OpId): string => `${counter}@${actor}`;

/** Lamport order: counter first, then actor. */
export const compareIds = (left: OpId, right: OpId): number =>
  left[0] !== right[0] ? left[0] - right[0] : left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : 0;

export const inClock = (clock: Clock, [counter, actor]: OpId): boolean => counter <= (clock.get(actor) ?? 0);
