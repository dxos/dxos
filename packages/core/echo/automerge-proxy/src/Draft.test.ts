//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Automerge from './Automerge.ts';
import * as Draft from './Draft.ts';
import * as Op from './Op.ts';
import { type Random, createRandom, initialDocument, randomValue } from './testing/index.ts';

// The same callbacks drive Automerge proxies and mirror drafts with arbitrary shapes, including writes
// both refuse, which no static type admits.
type AnyDraft = any;

type Callback = (draft: AnyDraft) => unknown;

type Outcome = { value: unknown; returned: unknown } | { threw: string };

/** A comparable form of a value; drafts must be rendered while their change callback runs. */
const render = (value: unknown): unknown => {
  if (value === undefined) {
    return { undefined: true };
  }
  if (typeof value === 'bigint') {
    return { bigint: String(value) };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return { number: String(value) };
  }
  if (value instanceof Date) {
    return { date: value.getTime() };
  }
  if (value instanceof Uint8Array) {
    return { bytes: [...value] };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => render(entry));
  }
  if (A.isImmutableString(value)) {
    return { raw: value.toString() };
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.keys(value).map((key) => [key, render(Reflect.get(value, key))]));
  }
  return value;
};

const viaAutomerge = (initial: Record<string, unknown>, callback: Callback): Outcome => {
  let returned: unknown;
  try {
    const doc = A.change(A.from(initial), (draft) => {
      returned = render(callback(draft));
    });
    return { value: render(doc), returned };
  } catch (error) {
    return { threw: String(error) };
  }
};

/** Runs the callback on a recording draft and returns the initial state with the recorded ops applied. */
const viaRecorder = (initial: Record<string, unknown>, callback: Callback): Outcome => {
  const base = Op.freeze(initial);
  const recorder = new Draft.Recorder(base);
  let returned: unknown;
  try {
    returned = render(callback(recorder.draft()));
  } catch (error) {
    expect(error instanceof RangeError || error instanceof TypeError, String(error)).toBe(true);
    return { threw: String(error) };
  }
  const { root } = Op.apply(base, recorder.ops, { strict: true });
  expect(Op.equals(root, recorder.current)).toBe(true);
  return { value: render(root), returned };
};

class Point {
  x = 1;
  y = 2;

  get sum() {
    return this.x + this.y;
  }
}

class Tagged {
  get [Symbol.toStringTag]() {
    return 'Tagged';
  }
}

const AGREE: [string, Record<string, unknown>, Callback][] = [
  // Drafts follow their container by identity.
  [
    'a held element follows an insert above it',
    { list: [{ title: 'zero' }, { title: 'one' }] },
    (draft) => {
      const item = draft.list[1];
      draft.list.insertAt(0, { title: 'new' });
      item.title = 'ONE';
    },
  ],
  [
    'a removed element is detached: writes through it are unseen, reads see them',
    { list: [{ title: 'zero' }, { title: 'one' }] },
    (draft) => {
      const item = draft.list[0];
      draft.list.deleteAt(0);
      item.title = 'ZERO';
      return item.title;
    },
  ],
  [
    'a map whose parent was replaced is detached',
    { a: { b: { c: 1 } } },
    (draft) => {
      const inner = draft.a.b;
      draft.a = { b: { c: 2 } };
      inner.c = 3;
      return inner.c;
    },
  ],
  [
    'a held list follows removals before it',
    { list: [{ l: [1] }, { l: [2] }, { l: [3] }] },
    (draft) => {
      const inner = draft.list[2].l;
      draft.list.splice(0, 2);
      inner.push(4);
    },
  ],
  [
    'drafts inside a detached subtree follow its own list edits',
    { m: { l: [{ t: 1 }] } },
    (draft) => {
      const map = draft.m;
      delete draft.m;
      const item = map.l[0];
      map.l.insertAt(0, { t: 0 });
      item.t = 5;
      return JSON.stringify(map);
    },
  ],
  [
    'popped and spliced-out elements are detached',
    { list: [{ t: 1 }, { t: 2 }, { t: 3 }] },
    (draft) => {
      const popped = draft.list.pop();
      const [removed] = draft.list.splice(0, 1);
      popped.t = 8;
      removed.t = 9;
      return [popped.t, removed.t, draft.list.length];
    },
  ],
  ['indexOf finds a draft of an element', { list: [{ t: 1 }, { t: 2 }] }, (draft) => draft.list.indexOf(draft.list[1])],
  [
    'includes finds primitives but never a draft, since each list read is new',
    { list: [{ t: 1 }, 'x'] },
    (draft) => [draft.list.includes(draft.list[0]), draft.list.includes('x'), draft.list.includes('y')],
  ],
  ['Object.keys of a list is empty', { list: ['a', 'b'] }, (draft) => [Object.keys(draft.list), { ...draft.list }]],
  [
    'delete removes a list element; deleting a missing map key does nothing',
    { list: ['a', 'b', 'c'], m: { a: 1 } },
    (draft) => {
      delete draft.list[0];
      delete draft.m.zzz;
    },
  ],
  [
    'insertAt and deleteAt return the list',
    { list: [1, 2, 3] },
    (draft) => {
      const inserted = draft.list.insertAt(1, 'a', 'b');
      const deleted = draft.list.deleteAt(0, 2);
      return [inserted === draft.list, deleted === draft.list, [...deleted]];
    },
  ],
  [
    'map reads are cached until written through the same draft; list reads are not',
    { list: [{ t: 'a' }], m: { x: {} } },
    (draft) => {
      const item = draft.list[0];
      const first = item.t;
      draft.list[0].t = 'b';
      return [first, item.t, JSON.stringify(item), draft.m.x === draft.m.x, draft.list[0] === draft.list[0]];
    },
  ],

  // List methods, their arguments and return values.
  [
    'push, pop, shift and unshift',
    { list: [1, 2, 3] },
    (draft) => [draft.list.push(4, 5), draft.list.pop(), draft.list.shift(), draft.list.unshift(0), draft.list.push()],
  ],
  [
    'splice clamps its count, reads a digit-string start and deletes to the end without a count',
    { list: [1, 2, 3, 4, 5] },
    (draft) => [draft.list.splice(3, 10, 'y'), draft.list.splice('0', 1), draft.list.splice(1)],
  ],
  [
    'assigning at the length appends, below it replaces',
    { list: [1] },
    (draft) => {
      draft.list[1] = { x: 1 };
      draft.list[1].y = 2;
      draft.list[0] = 'z';
    },
  ],
  [
    'fill writes a value over a range and returns the list',
    { list: [1, 2, 3, 4] },
    (draft) => {
      draft.list.fill('x', 1, 3);
      return draft.list.fill({ a: 1 }, 3) === draft.list;
    },
  ],
  [
    'deleteAt with a count clamps, and a negative count removes before the index',
    { list: [1, 2, 3, 4, 5] },
    (draft) => {
      draft.list.deleteAt(3, 10);
      draft.list.deleteAt(2, -1);
    },
  ],
  [
    'reading methods',
    { list: [3, 1, 2, 1] },
    (draft) => [
      draft.list.at(0),
      draft.list.at(-1),
      draft.list.indexOf(1),
      draft.list.indexOf(1, 2),
      draft.list.lastIndexOf(1),
      draft.list.find((value: number) => value < 3),
      draft.list.findIndex((value: number) => value < 3),
      draft.list.some((value: number) => value > 2),
      draft.list.every((value: number) => value > 0),
      draft.list.map((value: number, index: number) => value * index),
      draft.list.filter((value: number) => value > 1),
      draft.list.reduce((sum: number, value: number) => sum + value, 0),
      draft.list.join('-'),
      draft.list.concat([4]),
      draft.list.slice(1, -1),
      String(draft.list),
      [...draft.list.entries()],
      [...draft.list.keys()],
      [...draft.list.values()],
      [...draft.list],
    ],
  ],
  [
    'array members Automerge lacks are undefined',
    { list: [2, 1] },
    (draft) => [
      typeof draft.list.sort,
      typeof draft.list.reverse,
      typeof draft.list.flatMap,
      Array.isArray(draft.list),
      'length' in draft.list,
      0 in draft.list,
      5 in draft.list,
    ],
  ],
  [
    'JSON, spread, key order and in',
    { m: { 'b': 1, 'a': { d: [1, 'x'], c: null }, '10': 2, '9': 3, 'B': 4 } },
    (draft) => [
      JSON.stringify(draft),
      Object.keys(draft.m),
      JSON.stringify({ ...draft.m.a }),
      'a' in draft.m,
      'z' in draft.m,
    ],
  ],

  // Values Automerge stores.
  [
    'leaf and nested values',
    {},
    (draft) => {
      draft.text = 'text';
      draft.float = 1.5;
      draft.int = 42;
      draft.bool = true;
      draft.nothing = null;
      draft.date = new Date(1234);
      draft.bytes = new Uint8Array([1, 2]);
      draft.raw = new A.RawString('raw');
      draft.nested = { list: [1, [2, { deep: 'x' }]], empty: {} };
    },
  ],
  [
    'numbers are stored as Automerge reads them back',
    {},
    (draft) => {
      draft.unsafe = 2 ** 53;
      draft.huge = 1e20;
      draft.small = 5n;
      draft.large = 2n ** 60n;
      draft.nan = Number.NaN;
      return [draft.unsafe, draft.huge, draft.small, draft.large, draft.nan];
    },
  ],
  [
    'a class instance is stored as a map of its own fields',
    {},
    (draft) => {
      draft.point = new Point();
      draft.list = [new Point()];
    },
  ],
  [
    'a Date or byte array read through a draft is a copy',
    { m: { date: new Date(5), bytes: new Uint8Array([1]) } },
    (draft) => {
      draft.m.date.setTime(99);
      draft.m.bytes[0] = 7;
      return [draft.m.date.getTime(), draft.m.bytes[0]];
    },
  ],
  ['a spread copy of a map with primitive fields', { m: { a: 1, t: 'txt' } }, (draft) => (draft.copy = { ...draft.m })],
  [
    'ECHO sort-copy-assign and truncation of a list of primitives',
    { list: [3, 1, 2], other: ['a', 'b', 'c'] },
    (draft) => {
      draft.list = [...draft.list].sort();
      const copy = [...draft.other];
      copy.length = 1;
      draft.other = copy;
    },
  ],

  // Text.
  [
    'splice and updateText, through the root and through a nested draft',
    { t: 'hello', m: { s: 'abc' }, l: ['abc'] },
    (draft) => {
      Automerge.splice(draft, ['t'], 5, 0, ' world');
      Automerge.updateText(draft.m, ['s'], 'aXc');
      Automerge.splice(draft, ['l', '0'], 1, 0, 'Y');
      Automerge.splice(draft, ['t'], 2, -1, '');
      Automerge.updateText(draft, ['t'], 'helo world');
    },
  ],
  [
    'a text edit clears the cache of the draft it goes through, not of others',
    { m: { t: 'abc' } },
    (draft) => {
      const map = draft.m;
      const before = map.t;
      Automerge.splice(draft, ['m', 't'], 0, 0, 'X');
      return [before, map.t, draft.m.t];
    },
  ],
  [
    'splice through a detached draft edits the removed text only',
    { m: { t: 'abc' } },
    (draft) => {
      const map = draft.m;
      draft.m = { t: 'new' };
      Automerge.splice(map, ['t'], 0, 0, 'X');
      return map.t;
    },
  ],
];

const REFUSED: [string, Record<string, unknown>, Callback][] = [
  [
    'extending a list through length',
    { list: ['a'] },
    (draft) => {
      draft.list.length = 3;
    },
  ],
  [
    'truncating a list through length',
    { list: ['a', 'b', 'c'] },
    (draft) => {
      draft.list.length = 1;
    },
  ],
  [
    'a sparse array, as ECHO builds to extend a list',
    { list: ['a'] },
    (draft) => {
      const copy = [...draft.list];
      copy.length = 3;
      draft.list = copy;
    },
  ],
  [
    'undefined inside an array',
    {},
    (draft) => {
      draft.value = [undefined];
    },
  ],
  [
    'undefined inside a map',
    {},
    (draft) => {
      draft.value = { x: undefined };
    },
  ],
  [
    'assigning undefined',
    { a: 1 },
    (draft) => {
      draft.a = undefined;
    },
  ],
  ['pushing undefined', { list: [] }, (draft) => draft.list.push(undefined)],
  ['filling with undefined', { list: [1] }, (draft) => draft.list.fill(undefined)],
  ['a negative splice start', { list: [1, 2, 3, 4] }, (draft) => draft.list.splice(-2, 1, 'x')],
  ['a negative splice count', { list: [1, 2] }, (draft) => draft.list.splice(0, -1)],
  ['inserting past the end', { list: [1] }, (draft) => draft.list.insertAt(3, 'x')],
  [
    'assigning past the end',
    { list: ['a'] },
    (draft) => {
      draft.list[3] = 'x';
    },
  ],
  [
    'deleting past the end',
    { list: ['a'] },
    (draft) => {
      delete draft.list[5];
    },
  ],
  ['deleteAt past the end', { list: ['a'] }, (draft) => draft.list.deleteAt(1)],
  [
    'assigning a draft that is already in the document',
    { a: { x: 1 }, b: null },
    (draft) => {
      draft.b = draft.a;
    },
  ],
  [
    'nesting a draft that is already in the document',
    { a: { x: 1 } },
    (draft) => {
      draft.b = { y: [draft.a] };
    },
  ],
  ['pushing a draft that is already in the document', { a: { x: 1 }, list: [] }, (draft) => draft.list.push(draft.a)],
  [
    'ECHO sort-copy-assign of a list of maps',
    { list: [{ n: 2 }, { n: 1 }] },
    (draft) => {
      draft.list = [...draft.list].sort((left: AnyDraft, right: AnyDraft) => left.n - right.n);
    },
  ],
  [
    'writing back a detached draft',
    { a: { x: 1 }, b: {} },
    (draft) => {
      const detached = draft.a;
      delete draft.a;
      draft.b.y = detached;
    },
  ],
  [
    'a Map',
    {},
    (draft) => {
      draft.value = new Map();
    },
  ],
  [
    'a function',
    {},
    (draft) => {
      draft.value = () => 1;
    },
  ],
  [
    'a symbol',
    {},
    (draft) => {
      draft.value = Symbol('value');
    },
  ],
  [
    'a RegExp',
    {},
    (draft) => {
      draft.value = /x/;
    },
  ],
  [
    'a typed array other than bytes',
    {},
    (draft) => {
      draft.value = new Uint16Array([1]);
    },
  ],
  [
    'an object without a prototype',
    {},
    (draft) => {
      draft.value = { nested: Object.create(null) };
    },
  ],
  [
    'an object with its own toStringTag',
    {},
    (draft) => {
      draft.value = new Tagged();
    },
  ],
  [
    'the key __proto__',
    {},
    (draft) => {
      draft.value = JSON.parse('{"__proto__": 1}');
    },
  ],
  [
    'a bigint beyond 64 bits',
    {},
    (draft) => {
      draft.value = 2n ** 64n;
    },
  ],
  ['sort on a list draft', { list: [2, 1] }, (draft) => draft.list.sort()],
  ['updateText on a RawString', { t: new A.RawString('abc') }, (draft) => Automerge.updateText(draft, ['t'], 'aXc')],
  ['splice on a RawString', { t: new A.RawString('abc') }, (draft) => Automerge.splice(draft, ['t'], 0, 0, 'X')],
  ['updateText on a missing path', { a: 1 }, (draft) => Automerge.updateText(draft, ['t'], 'x')],
  ['updateText on a map', { t: {} }, (draft) => Automerge.updateText(draft, ['t'], 'x')],
  ['splice past the end of the text', { t: 'abc' }, (draft) => Automerge.splice(draft, ['t'], 5, 0, 'X')],
];

const KEYS = ['a', 'b', 'title', 'items'];

/** A container reached by walking a few random steps down from `draft`. */
const pickContainer = (random: Random, draft: AnyDraft): AnyDraft => {
  let node = draft;
  while (random.chance(0.6)) {
    const keys: (string | number)[] = Array.isArray(node) ? [...node.keys()] : Object.keys(node);
    const children = keys.filter((key) => typeof node[key] === 'object' && node[key] !== null);
    if (children.length === 0) {
      break;
    }
    node = node[random.pick(children)];
  }
  return node;
};

/** One random edit of a list draft, returning what the edit returned. */
const randomListEdit = (random: Random, list: AnyDraft, held: AnyDraft[], value: () => unknown): unknown => {
  const length = list.length;
  switch (random.int(7)) {
    case 0:
      return list.insertAt(random.int(length + 1), value()) === list;
    case 1:
      return list.deleteAt(random.int(length + 1), random.int(3)) === list;
    case 2:
      return render(list.splice(random.int(length + 1), random.int(3), value()));
    case 3:
      list[random.int(length + 1)] = value();
      return undefined;
    case 4:
      return render(random.chance(0.5) ? list.pop() : list.shift());
    case 5:
      return list.indexOf(random.pick(held));
    default: {
      // List reads are uncached, so an element read as text is text now.
      const texts = [...list.keys()].filter((index) => typeof list[index] === 'string');
      if (texts.length > 0) {
        const index = random.pick(texts);
        const text: string = list[index];
        const at = random.int(text.length + 1);
        Automerge.splice(list, [index], at, random.int(text.length - at + 1), String(length));
      }
      return undefined;
    }
  }
};

/** One random edit of a map draft. */
const randomMapEdit = (random: Random, map: AnyDraft, value: () => unknown): void => {
  const keys = Object.keys(map);
  const texts = keys.filter((key) => typeof map[key] === 'string');
  if (texts.length > 0 && random.chance(0.3)) {
    // A cached read may be stale; updateText then fails for both, where splice on a list would not.
    const key = random.pick(texts);
    const text: string = map[key];
    const at = random.int(text.length + 1);
    Automerge.updateText(map, [key], `${text.slice(0, at)}<${keys.length}>${text.slice(at + 1)}`);
  } else if (keys.length > 0 && random.chance(0.3)) {
    delete map[random.pick(keys)];
  } else {
    map[random.pick(KEYS)] = value();
  }
};

/** Random list, map and text edits through drafts held across them; returns what it read along the way. */
const randomEdits = (random: Random, root: AnyDraft): unknown[] => {
  const trace: unknown[] = [];
  const held: AnyDraft[] = [root];
  for (let step = 0; step < 40; step++) {
    const target = random.chance(0.5) ? random.pick(held) : pickContainer(random, root);
    if (random.chance(0.3)) {
      held.push(target);
    }
    const value = () => randomValue(random, 1, `${step}.`);
    try {
      trace.push(
        Array.isArray(target) ? randomListEdit(random, target, held, value) : randomMapEdit(random, target, value),
      );
    } catch {
      // A map draft's reads are cached, so an edit built from a stale read is refused, by both.
      trace.push('refused');
    }
    trace.push(JSON.stringify(random.pick(held)));
  }
  return trace;
};

describe('Draft.Recorder', () => {
  test.each(AGREE)('agrees with A.change: %s', (_name, initial, callback) => {
    const expected = viaAutomerge(initial, callback);
    expect(expected).not.toHaveProperty('threw');
    expect(viaRecorder(initial, callback)).toEqual(expected);
  });

  test.each(REFUSED)('refuses what A.change refuses: %s', (_name, initial, callback) => {
    expect(viaAutomerge(initial, callback)).toHaveProperty('threw');
    expect(viaRecorder(initial, callback)).toHaveProperty('threw');
  });

  test('refuses nested values Automerge would store as lossy maps', () => {
    const callback: Callback = (draft) => {
      draft.value = { map: new Map([['key', 1]]), fn: () => 1 };
    };
    expect(viaAutomerge({}, callback)).toEqual({
      value: { value: { map: {}, fn: {} } },
      returned: { undefined: true },
    });
    expect(viaRecorder({}, callback)).toHaveProperty('threw');
  });

  test('refuses a text splice on a list, which Automerge turns into RawString elements', () => {
    const callback: Callback = (draft) => Automerge.splice(draft, ['list'], 1, 0, 'XY');
    expect(viaAutomerge({ list: ['a'] }, callback)).toEqual({
      value: { list: ['a', { raw: 'X' }, { raw: 'Y' }] },
      returned: { undefined: true },
    });
    expect(viaRecorder({ list: ['a'] }, callback)).toHaveProperty('threw');
  });

  test('Draft.getInfo reports where a held draft is now', () => {
    const recorder = new Draft.Recorder(Op.freeze({ list: [{ t: 0 }, { t: 1 }] }));
    const draft: AnyDraft = recorder.draft();
    const item = draft.list[1];
    draft.list.insertAt(0, { t: -1 });
    expect(Draft.getInfo(item)).toMatchObject({ path: ['list', 2], attached: true });
    item.t = 2;
    draft.list.deleteAt(2);
    expect(Draft.getInfo(item)).toMatchObject({ path: [], attached: false });
    item.t = 3;
    expect(recorder.ops).toEqual([
      { type: 'insert', path: ['list', 0], values: [{ t: -1 }] },
      { type: 'put', path: ['list', 2, 't'], value: 2 },
      { type: 'remove', path: ['list', 2], count: 1 },
    ]);
  });

  test('random edits through held drafts agree with A.change', () => {
    const seeds = Number(process.env.RECORDER_FUZZ_SEEDS ?? 100);
    for (let seed = 1; seed <= seeds; seed++) {
      const callback: Callback = (draft) => randomEdits(createRandom(seed), draft);
      const initial = initialDocument();
      const expected = viaAutomerge(initial, callback);
      expect(expected, `seed ${seed}`).not.toHaveProperty('threw');
      expect(viaRecorder(initial, callback), `seed ${seed}`).toEqual(expected);
    }
  });
});
