//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Node, TemplateParseError, fromState, resolve, select } from './index';
import { parse } from './parser';

describe('parse', () => {
  test('reads the three attribute families', ({ expect }) => {
    const node = parse(
      `<container gap="sm">
         <display variant="title" data-text="title" />
         <control label="Name" data-value="title" on-commit="org.dxos.operation.projects.rename" />
       </container>`,
    );

    expect(node.tag).toBe('container');
    expect(node.props).toEqual({ gap: 'sm' });

    const [display, control] = node.children as Node[];
    expect(display.data).toEqual({ text: { from: 'state', path: ['title'] } });
    expect(control.events).toEqual({ commit: 'org.dxos.operation.projects.rename' });
  });

  test('narrows numeric and boolean literals so the renderer never parses strings', ({ expect }) => {
    const node = parse('<layout cols="3" wrap="true" gap="sm" />');
    expect(node.props).toEqual({ cols: 3, wrap: true, gap: 'sm' });
  });

  test('an item binding is scoped to the collection element', ({ expect }) => {
    const node = parse('<collection data-items="tags"><display item-text="." /></collection>');
    const [child] = node.children as Node[];
    expect(node.data).toEqual({ items: { from: 'state', path: ['tags'] } });
    // A bare `.` is the item itself, so the path is empty rather than a literal key.
    expect(child.data).toEqual({ text: { from: 'item', path: [] } });
  });

  test('an unknown tag is an error, not a dropped element', ({ expect }) => {
    // ONTOLOGY R-8: a silently dropped element renders as though the author never wrote it.
    expect(() => parse('<widget />')).toThrow(TemplateParseError);
    expect(() => parse('<container><widget /></container>')).toThrow(/unknown tag 'widget'/);
  });

  test('an event value must name an operation key', ({ expect }) => {
    // ONTOLOGY R-3: the only outbound edge is an operation, never an arbitrary token.
    expect(() => parse('<control on-activate="rename" />')).toThrow(/must name an operation key/);
  });

  test('reports unbalanced and multi-root documents', ({ expect }) => {
    expect(() => parse('<container><display /></layout>')).toThrow(/expected <\/container>/);
    expect(() => parse('<container>')).toThrow(/unclosed <container>/);
    expect(() => parse('<display /><display />')).toThrow(/exactly one root/);
  });

  test('text content is not part of the grammar', ({ expect }) => {
    // A bound string is a `display` node with a binding, never a text child.
    expect(() => parse('<container>hello</container>')).toThrow(/unexpected text/);
  });

  test('when/on are intrinsic state bindings despite the missing data- prefix', ({ expect }) => {
    const show = parse('<show when="selected.name"><display data-text="selected.name" /></show>');
    expect(show.data).toEqual({ when: { from: 'state', path: ['selected', 'name'] } });

    const node = parse('<switch on="view"><match value="list"><display data-text="title" /></match></switch>');
    expect(node.data).toEqual({ on: { from: 'state', path: ['view'] } });
  });

  test('structural validation runs over the whole tree', ({ expect }) => {
    // `let` requires a machine.
    expect(() => parse('<container id="x"><let name="a" /></container>')).toThrow(/'let' requires a machine/);
    // `let` requires an enclosing element with an id.
    expect(() => parse('<container><let name="a" machine="org.dxos.machine.flag" /></container>')).toThrow(
      /enclosing element with an id/,
    );
    // `fallback` is only valid inside `show`.
    expect(() => parse('<container><fallback><display data-text="title" /></fallback></container>')).toThrow(
      /'fallback' is only valid inside 'show'/,
    );
    // `switch` children must be `match`.
    expect(() => parse('<switch on="view"><display data-text="title" /></switch>')).toThrow(
      /'switch' children must be 'match'/,
    );
    // `show` requires a when binding; `switch` requires on.
    expect(() => parse('<show><display data-text="title" /></show>')).toThrow(/'show' requires a when binding/);
    expect(() => parse('<switch><match value="list"><display data-text="title" /></match></switch>')).toThrow(
      /'switch' requires an on binding/,
    );
  });
});

describe('resolve', () => {
  type State = { title: string; nested: { count: number } };
  const state: State = { title: 'MOSAIC', nested: { count: 3 } };

  test('walks a typed path', ({ expect }) => {
    expect(resolve(fromState(select<State>().title), { state })).toBe('MOSAIC');
    expect(resolve(fromState(select<State>().nested.count), { state })).toBe(3);
  });

  test('a path that does not resolve yields undefined rather than throwing', ({ expect }) => {
    expect(resolve({ from: 'state', path: ['missing', 'deeper'] }, { state })).toBeUndefined();
  });

  test('an item binding reads the collection scope', ({ expect }) => {
    expect(resolve({ from: 'item', path: [] }, { state, item: 'ontology' })).toBe('ontology');
  });
});

describe('attribute edge cases', () => {
  test("a quoted '>' does not terminate the tag", ({ expect }) => {
    const node = parse('<display label="a > b" data-text="title" />');
    expect(node.props).toEqual({ label: 'a > b' });
    expect(node.data).toEqual({ text: { from: 'state', path: ['title'] } });
  });

  test('signed and fractional numerics are coerced', ({ expect }) => {
    const node = parse('<layout span="1.5" offset="-2" />');
    expect(node.props).toEqual({ span: 1.5, offset: -2 });
  });
});
