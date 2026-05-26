//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LayoutParseError, parseLayout } from './parser';

describe('parseLayout', () => {
  test('grid with two fields', ({ expect }) => {
    const tree = parseLayout(`<grid cols="2"><field name="a"/><field name="b"/></grid>`);
    expect(tree).toEqual({
      kind: 'grid',
      cols: 2,
      children: [
        { kind: 'field', name: 'a', span: undefined },
        { kind: 'field', name: 'b', span: undefined },
      ],
    });
  });

  test('field with span attribute', ({ expect }) => {
    const tree = parseLayout(`<grid cols="3"><field name="a" span="2"/><field name="b"/></grid>`);
    expect(tree).toEqual({
      kind: 'grid',
      cols: 3,
      children: [
        { kind: 'field', name: 'a', span: 2 },
        { kind: 'field', name: 'b', span: undefined },
      ],
    });
  });

  test('dotted field name', ({ expect }) => {
    const tree = parseLayout(`<grid cols="1"><field name="details.airline"/></grid>`);
    expect(tree).toEqual({
      kind: 'grid',
      cols: 1,
      children: [{ kind: 'field', name: 'details.airline', span: undefined }],
    });
  });

  test('nested grids', ({ expect }) => {
    const tree = parseLayout(`
      <grid cols="2">
        <field name="a"/>
        <grid cols="2">
          <field name="b"/>
          <field name="c"/>
        </grid>
      </grid>
    `);
    expect(tree.kind).toBe('grid');
    if (tree.kind !== 'grid') {
      return;
    }
    expect(tree.cols).toBe(2);
    expect(tree.children).toHaveLength(2);
    const inner = tree.children[1];
    expect(inner.kind).toBe('grid');
    if (inner.kind === 'grid') {
      expect(inner.cols).toBe(2);
      expect(inner.children).toHaveLength(2);
    }
  });

  test('accepts single-quoted and unquoted attributes', ({ expect }) => {
    const tree = parseLayout(`<grid cols=2><field name='x' span=3/></grid>`);
    expect(tree).toEqual({
      kind: 'grid',
      cols: 2,
      children: [{ kind: 'field', name: 'x', span: 3 }],
    });
  });

  test('ignores whitespace between tags', ({ expect }) => {
    const tree = parseLayout(`
      <grid cols="1">
        <field name="x"/>
      </grid>
    `);
    expect(tree.kind).toBe('grid');
  });

  test('empty template throws', ({ expect }) => {
    expect(() => parseLayout('')).toThrow(LayoutParseError);
  });

  test('text content between tags throws', ({ expect }) => {
    expect(() => parseLayout(`<grid cols="1">hello<field name="x"/></grid>`)).toThrow(/unexpected text content/);
  });

  test('missing required cols attribute throws', ({ expect }) => {
    expect(() => parseLayout(`<grid><field name="x"/></grid>`)).toThrow(/missing required attribute "cols"/);
  });

  test('missing required field name throws', ({ expect }) => {
    expect(() => parseLayout(`<grid cols="1"><field/></grid>`)).toThrow(/missing required attribute "name"/);
  });

  test('non-integer cols throws', ({ expect }) => {
    expect(() => parseLayout(`<grid cols="auto"><field name="x"/></grid>`)).toThrow(/expects an integer/);
  });

  test('non-grid root throws', ({ expect }) => {
    expect(() => parseLayout(`<field name="x"/>`)).toThrow(/root element must be <grid>/);
  });

  test('unclosed grid throws', ({ expect }) => {
    expect(() => parseLayout(`<grid cols="1"><field name="x"/>`)).toThrow(/<grid> not closed/);
  });

  test('non-self-closing field throws', ({ expect }) => {
    expect(() => parseLayout(`<grid cols="1"><field name="x"></field></grid>`)).toThrow(/must be self-closing/);
  });

  test('unknown element throws', ({ expect }) => {
    expect(() => parseLayout(`<grid cols="1"><row name="x"/></grid>`)).toThrow(/unknown element <row>/);
  });
});
