//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DEFAULT_SCRIPT_PROPERTIES } from '@dxos/animation';
import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';

import { sceneTargets } from '../../model/scene-stage.ts';
import { scene2dStage, scene3dStage } from './definition.ts';

const read = (name: keyof typeof EXEMPLARS) => Dsl.readScenes(EXEMPLARS[name]).document;

describe('scene stage definitions', () => {
  test.each([
    ['2d', scene2dStage, 'links', 'a'],
    ['3d', scene3dStage, 'cluster', 'hub'],
  ] as const)('every property a %s script writes is a keyable path', (_dim, stage, exemplar, id) => {
    const paths = sceneTargets(read(exemplar))
      .find((target) => target.id === id)
      ?.properties.map((property) => property.path);
    const written = Object.values({ ...DEFAULT_SCRIPT_PROPERTIES, ...stage.scriptProperties });
    expect(paths).toEqual(expect.arrayContaining(written));
  });
});
