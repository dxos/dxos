//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parseFieldType } from './field-type.ts';

describe('parseFieldType', () => {
  test.each([
    ['Prose', { kind: 'prose' }],
    ['Ref<feat>[]', { kind: 'ref', to: ['feat'], many: true }],
    ['Ref<spec>', { kind: 'ref', to: ['spec'], many: false }],
    ['TypeRef[]', { kind: 'ref', to: ['type'], many: true }],
    ['OpRefList', { kind: 'ref', to: ['op'], many: true }],
    ['ServiceList', { kind: 'ref', to: ['service'], many: true }],
    ['RefList', { kind: 'ref', to: [], many: true }],
    ['FieldMap', { kind: 'map', value: 'type' }],
    ['ErrorMap', { kind: 'map', value: 'prose' }],
    ['RequirementList', { kind: 'keyed' }],
    ['ProseList', { kind: 'list' }],
    ['Step | Step[]', { kind: 'list' }],
    ['planned | in-progress | operational', { kind: 'literal', options: ['planned', 'in-progress', 'operational'] }],
    ['OpInvocation', { kind: 'raw' }],
  ])('%s', (expr, type) => {
    expect(parseFieldType(expr)).toEqual(type);
  });
});
