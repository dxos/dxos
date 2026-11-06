//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { NodeStyle, RectNode, boxFields, linkBase, nodeBase } from './element.ts';

describe('element base', () => {
  test('the scene element base has every react-ui-canvas node and link field', () => {
    expect(Object.keys(nodeBase).sort()).toEqual(
      [
        'center',
        'class',
        'exposed',
        'id',
        'layer',
        'locked',
        'ports',
        'portsPerSide',
        'rotation',
        'size',
        'style',
        'z',
      ].sort(),
    );
    expect(Object.keys(linkBase).sort()).toEqual(
      ['class', 'connector', 'ends', 'id', 'layer', 'locked', 'source', 'style', 'target', 'text', 'z'].sort(),
    );
    expect(Object.keys(boxFields)).toEqual(['label']);
  });

  test('a node type is the base plus its own fields', () => {
    expect(Object.keys(RectNode.fields).sort()).toEqual(['type', ...Object.keys(nodeBase), 'label'].sort());
    expect(Object.keys(NodeStyle.fields)).toContain('hue');
  });
});
