//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Op from './Op.ts';

/**
 * How a write and a delete of the same map key or list element resolve. Concurrent writers follow
 * Automerge, where the write wins in either order. Taking back a refused change lets the later
 * changes win, since they were made on top of it.
 */
export type ConflictRule = 'write-wins' | 'later-wins';

/**
 * Transforms `a` so that it applies after `b`, where both were made against the same state.
 *
 * `aFirst` says whether `a` precedes `b` in the worker's order. It decides ties: of two inserts at
 * the same position the earlier one lands first, and of two writes to the same path the later one
 * wins. `rule` decides a write against a delete. The worker transforms a stale batch with
 * `aFirst = false` against the entries it missed; a tab transforms incoming entries with
 * `aFirst = true` against its unconfirmed edits. Using one function on both sides is what makes the
 * two converge.
 *
 * Returns zero ops when `a` no longer has a target, and two when `b` split the range `a` removes.
 */
export const pair = (a: Op.Any, b: Op.Any, aFirst: boolean, rule: ConflictRule = 'write-wins'): Op.Any[] => {
  switch (b.type) {
    case 'splice':
      return overSplice(a, b, aFirst);
    case 'put':
    case 'del':
      return overWrite(a, b, aFirst, rule);
    case 'insert':
    case 'remove':
      return overListOp(a, b, aFirst, rule);
  }
};

/**
 * Transforms two op lists made against the same state: returns `as` rebased onto `bs` and `bs`
 * rebased onto `as`. Applying `bs` then the first result equals applying `as` then the second.
 */
export const lists = (
  as: readonly Op.Any[],
  bs: readonly Op.Any[],
  aFirst: boolean,
  rule: ConflictRule = 'write-wins',
): [Op.Any[], Op.Any[]] => {
  let bCurrent: Op.Any[] = bs.slice();
  const aOut: Op.Any[] = [];
  for (const a of as) {
    let aCurrent: Op.Any[] = [a];
    const bNext: Op.Any[] = [];
    for (const b of bCurrent) {
      const [aTransformed, bTransformed] = transformSmall(aCurrent, [b], aFirst, rule);
      aCurrent = aTransformed;
      bNext.push(...bTransformed);
    }
    aOut.push(...aCurrent);
    bCurrent = bNext;
  }
  return [aOut, bCurrent];
};

/**
 * {@link lists} for a list of changes, keeping each change's ops together, since the worker
 * writes or refuses a change as a unit. A change can come out empty.
 */
export const changes = (
  list: readonly Op.Change[],
  ops: readonly Op.Any[],
  aFirst: boolean,
  rule: ConflictRule = 'write-wins',
): [Op.Any[][], Op.Any[]] => {
  const rebased: Op.Any[][] = [];
  let past: Op.Any[] = ops.slice();
  for (const change of list) {
    const [changePrime, pastPrime] = lists(change, past, aFirst, rule);
    rebased.push(changePrime);
    past = pastPrime;
  }
  return [rebased, past];
};

/** Recursive form of {@link lists} for the one- and two-op lists a split produces. */
const transformSmall = (as: Op.Any[], bs: Op.Any[], aFirst: boolean, rule: ConflictRule): [Op.Any[], Op.Any[]] => {
  if (as.length === 0 || bs.length === 0) {
    return [as, bs];
  }
  if (as.length === 1 && bs.length === 1) {
    return [pair(as[0], bs[0], aFirst, rule), pair(bs[0], as[0], !aFirst, rule)];
  }
  if (as.length > 1) {
    const [head, bs1] = transformSmall([as[0]], bs, aFirst, rule);
    const [rest, bs2] = transformSmall(as.slice(1), bs1, aFirst, rule);
    return [[...head, ...rest], bs2];
  }
  const [as1, head] = transformSmall(as, [bs[0]], aFirst, rule);
  const [as2, rest] = transformSmall(as1, bs.slice(1), aFirst, rule);
  return [as2, [...head, ...rest]];
};

const samePath = (left: Op.Path, right: Op.Path) =>
  left.length === right.length && left.every((key, index) => String(key) === String(right[index]));

const isStrictPrefix = (prefix: Op.Path, path: Op.Path) =>
  prefix.length < path.length && prefix.every((key, index) => String(key) === String(path[index]));

const withSegment = (op: Op.Any, depth: number, index: number): Op.Any => ({
  ...op,
  path: [...op.path.slice(0, depth), index, ...op.path.slice(depth + 1)],
});

/** `b` replaced or deleted the value at its path, so anything `a` does inside it has no target. */
const overWrite = (a: Op.Any, b: Op.Any, aFirst: boolean, rule: ConflictRule): Op.Any[] => {
  if (isStrictPrefix(b.path, a.path)) {
    return [];
  }
  if (a.type === 'remove' && b.type === 'put') {
    return rule === 'later-wins' && !aFirst ? [a] : removeAroundWrite(a, b);
  }
  if (!samePath(a.path, b.path)) {
    return [a];
  }
  switch (a.type) {
    case 'put':
    case 'del':
      if (a.type === 'del' && b.type === 'del') {
        return [];
      }
      if (rule === 'write-wins' && a.type !== b.type) {
        // A delete only removes what its writer saw, so it loses to a concurrent write.
        return a.type === 'put' ? [a] : [];
      }
      // The later write wins: `a` survives only when it comes after `b`.
      return aFirst ? [] : [a];
    case 'splice':
      // The text `a` edits was replaced or deleted.
      return [];
    case 'insert':
    case 'remove':
      // `b` replaced the element at this index without changing the list's length.
      return [a];
  }
};

/** `b` inserted into or removed from a list; shift or drop whatever `a` addresses in it. */
const overListOp = (a: Op.Any, b: Op.Any, aFirst: boolean, rule: ConflictRule): Op.Any[] => {
  if (b.type !== 'insert' && b.type !== 'remove') {
    return [a];
  }
  const listPath = b.path.slice(0, -1);
  const depth = listPath.length;
  if (a.path.length <= depth || !listPath.every((key, index) => String(key) === String(a.path[index]))) {
    return [a];
  }
  const at = Number(b.path[depth]);
  const index = Number(a.path[depth]);
  const onList = (a.type === 'insert' || a.type === 'remove') && a.path.length === depth + 1;

  if (b.type === 'insert') {
    const count = b.values.length;
    if (!onList) {
      return [withSegment(a, depth, index >= at ? index + count : index)];
    }
    if (a.type === 'insert') {
      const shifted = index < at ? index : index > at ? index + count : aFirst ? index : index + count;
      return [withSegment(a, depth, shifted)];
    }
    if (a.type === 'remove') {
      if (index >= at) {
        return [withSegment(a, depth, index + count)];
      }
      if (index + a.count <= at) {
        return [a];
      }
      // The insert landed inside the removed range: remove the original elements on either side of it.
      const before = at - index;
      return [
        { ...a, count: before },
        { ...a, path: [...listPath, index + count], count: a.count - before },
      ];
    }
    return [a];
  }

  const removed = b.count;
  const map = (position: number) => (position <= at ? position : position >= at + removed ? position - removed : at);
  if (!onList) {
    if (index >= at && index < at + removed) {
      // A write to the element itself keeps it, where the removed range closed up; edits inside it are lost.
      return a.type === 'put' && a.path.length === depth + 1 && (rule === 'write-wins' || !aFirst)
        ? [{ type: 'insert', path: [...listPath, at], values: [a.value] }]
        : [];
    }
    return [withSegment(a, depth, index >= at + removed ? index - removed : index)];
  }
  if (a.type === 'insert') {
    return [withSegment(a, depth, map(index))];
  }
  if (a.type === 'remove') {
    const start = map(index);
    const count = map(index + a.count) - start;
    return count > 0 ? [{ ...a, path: [...listPath, start], count }] : [];
  }
  return [a];
};

/** A remove spares the list element a concurrent write set, which Automerge keeps. */
const removeAroundWrite = (a: Op.Remove, b: Op.Put): Op.Any[] => {
  const listPath = a.path.slice(0, -1);
  // A put whose parent is the remove's list writes one of its elements.
  if (!samePath(listPath, b.path.slice(0, -1))) {
    return [a];
  }
  const written = Number(b.path.at(-1));
  const at = Number(a.path.at(-1));
  if (written < at || written >= at + a.count) {
    return [a];
  }
  const before = written - at;
  const after = a.count - before - 1;
  return [
    ...(before > 0 ? [{ ...a, count: before }] : []),
    ...(after > 0 ? [{ ...a, path: [...listPath, at + 1], count: after }] : []),
  ];
};

/** `b` edited a text in place; only another edit to the same text needs rebasing. */
const overSplice = (a: Op.Any, b: Op.Splice, aFirst: boolean): Op.Any[] => {
  if (a.type !== 'splice' || !samePath(a.path, b.path)) {
    return [a];
  }
  const length = Math.max(a.index + a.remove, b.index + b.remove);
  const aPrime = aFirst
    ? transformText(toComponents(a, length), toComponents(b, length))[0]
    : transformText(toComponents(b, length), toComponents(a, length))[1];
  return toSplices(a.path, aPrime);
};

/**
 * A text edit as a sequence over the whole text: positive numbers retain, negative numbers delete,
 * strings insert. This is the representation ot.js transforms.
 */
type Component = number | string;

const toComponents = (op: Op.Splice, length: number): Component[] => {
  const components: Component[] = [];
  if (op.index > 0) {
    components.push(op.index);
  }
  if (op.remove > 0) {
    components.push(-op.remove);
  }
  if (op.insert.length > 0) {
    components.push(op.insert);
  }
  const rest = length - op.index - op.remove;
  if (rest > 0) {
    components.push(rest);
  }
  return components;
};

class ComponentBuilder {
  readonly components: Component[] = [];

  retain(count: number): void {
    if (count <= 0) {
      return;
    }
    const last = this.components.at(-1);
    if (typeof last === 'number' && last > 0) {
      this.components[this.components.length - 1] = last + count;
    } else {
      this.components.push(count);
    }
  }

  insert(text: string): void {
    if (text.length === 0) {
      return;
    }
    const last = this.components.at(-1);
    if (typeof last === 'string') {
      this.components[this.components.length - 1] = last + text;
    } else {
      this.components.push(text);
    }
  }

  delete(count: number): void {
    if (count <= 0) {
      return;
    }
    const last = this.components.at(-1);
    if (typeof last === 'number' && last < 0) {
      this.components[this.components.length - 1] = last - count;
    } else {
      this.components.push(-count);
    }
  }
}

/**
 * The ot.js text transform: both inputs cover the same base text; the first input's inserts win ties.
 * Returns the first rebased onto the second and the second rebased onto the first.
 */
const transformText = (first: Component[], second: Component[]): [Component[], Component[]] => {
  const firstPrime = new ComponentBuilder();
  const secondPrime = new ComponentBuilder();
  let i1 = 0;
  let i2 = 0;
  let op1: Component | undefined = first[i1++];
  let op2: Component | undefined = second[i2++];

  while (op1 !== undefined || op2 !== undefined) {
    if (typeof op1 === 'string') {
      firstPrime.insert(op1);
      secondPrime.retain(op1.length);
      op1 = first[i1++];
      continue;
    }
    if (typeof op2 === 'string') {
      firstPrime.retain(op2.length);
      secondPrime.insert(op2);
      op2 = second[i2++];
      continue;
    }
    if (op1 === undefined || op2 === undefined) {
      throw new Error('Text edits cover different lengths');
    }

    if (op1 > 0 && op2 > 0) {
      const count = Math.min(op1, op2);
      firstPrime.retain(count);
      secondPrime.retain(count);
      [op1, op2, i1, i2] = advance(first, second, op1, op2, i1, i2, count, count);
    } else if (op1 < 0 && op2 < 0) {
      const count = Math.min(-op1, -op2);
      [op1, op2, i1, i2] = advance(first, second, op1, op2, i1, i2, -count, -count);
    } else if (op1 < 0 && op2 > 0) {
      const count = Math.min(-op1, op2);
      firstPrime.delete(count);
      [op1, op2, i1, i2] = advance(first, second, op1, op2, i1, i2, -count, count);
    } else if (op1 > 0 && op2 < 0) {
      const count = Math.min(op1, -op2);
      secondPrime.delete(count);
      [op1, op2, i1, i2] = advance(first, second, op1, op2, i1, i2, count, -count);
    } else {
      throw new Error('Empty text component');
    }
  }

  return [firstPrime.components, secondPrime.components];
};

/** Consumes `used1`/`used2` of the current components, moving on to the next one when exhausted. */
const advance = (
  first: Component[],
  second: Component[],
  op1: number,
  op2: number,
  i1: number,
  i2: number,
  used1: number,
  used2: number,
): [Component | undefined, Component | undefined, number, number] => {
  let next1: Component | undefined = op1 - used1;
  let next2: Component | undefined = op2 - used2;
  if (next1 === 0) {
    next1 = first[i1++];
  }
  if (next2 === 0) {
    next2 = second[i2++];
  }
  return [next1, next2, i1, i2];
};

/** Turns a component sequence back into splices applied one after another. */
const toSplices = (path: Op.Path, components: Component[]): Op.Splice[] => {
  const splices: Op.Splice[] = [];
  let position = 0;
  for (const component of components) {
    if (typeof component === 'string') {
      const last = splices.at(-1);
      if (last && last.index + last.insert.length === position && last.insert.length === 0) {
        splices[splices.length - 1] = { ...last, insert: component };
      } else {
        splices.push({ type: 'splice', path, index: position, remove: 0, insert: component });
      }
      position += component.length;
    } else if (component > 0) {
      position += component;
    } else {
      splices.push({ type: 'splice', path, index: position, remove: -component, insert: '' });
    }
  }
  return splices;
};
