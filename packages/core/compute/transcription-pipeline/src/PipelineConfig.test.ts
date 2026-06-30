//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { resolveModel } from './model-routing';
import { DEFAULT_STAGE_MODEL, findPreset } from './PipelineConfig';
import { makeCorrectionStage } from './stages';

describe('PipelineConfig', () => {
  test('meeting preset enables the three real stages in order', ({ expect }) => {
    const enabled = findPreset('Meeting')!
      .stages.filter((stage) => stage.enabled)
      .map((stage) => stage.id);
    expect(enabled).toEqual(['correct', 'extract', 'summarize']);
  });

  test('notes preset runs correction only', ({ expect }) => {
    const enabled = findPreset('Notes')!
      .stages.filter((stage) => stage.enabled)
      .map((stage) => stage.id);
    expect(enabled).toEqual(['correct']);
  });
});

describe('resolveModel', () => {
  test('config override beats stage default beats preset default', ({ expect }) => {
    const stage = makeCorrectionStage();
    const override = 'com.meta.model.llama-3-2-1b.instruct';
    expect(resolveModel({ id: 'correct', enabled: true, model: override }, stage)).toEqual(override);
    expect(resolveModel(undefined, stage)).toEqual(stage.model);
    expect(resolveModel({ id: 'correct', enabled: true }, { ...stage, model: undefined }, DEFAULT_STAGE_MODEL)).toEqual(
      DEFAULT_STAGE_MODEL,
    );
  });
});
