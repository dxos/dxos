//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SvgBuilder } from '#model';

import * as Drawing from './Drawing.ts';
import * as IllustratorCapabilities from './IllustratorCapabilities.ts';

const variant = (
  id: string,
  extra: { hidden?: boolean; createOnly?: boolean } = {},
): IllustratorCapabilities.DrawingVariant => ({ id, label: id, builder: SvgBuilder, ...extra });

describe('editTargets', () => {
  test('offers every other visible variant, but not one that is only for creating', () => {
    const variants = [variant('a'), variant('b'), variant('c', { hidden: true }), variant('d', { createOnly: true })];
    expect(IllustratorCapabilities.editTargets(variants, 'a').map(({ id }) => id)).toEqual(['b']);
  });
});

describe('convertTargets', () => {
  test('a canvas its variant cannot copy offers no targets; one it can offers the other variants', () => {
    const canvas = Drawing.makeCanvas({ schema: 'a' });
    const variants = [variant('a'), variant('b')];
    expect(IllustratorCapabilities.convertTargets(canvas, variants).map(({ id }) => id)).toEqual(['b']);
    const refusing = [{ ...variant('a'), convertible: () => false }, variant('b')];
    expect(IllustratorCapabilities.convertTargets(canvas, refusing)).toEqual([]);
  });
});
