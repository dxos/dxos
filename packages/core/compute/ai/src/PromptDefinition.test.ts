//
// Copyright 2026 DXOS.org
//

import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as PromptDefinition from './PromptDefinition.ts';

const Cron = PromptDefinition.make({ id: 'test.cron', title: 'Cron', text: 'Five space-separated fields.' });
const Unit = PromptDefinition.make({ id: 'test.unit', title: 'Unit', text: 'An SI unit symbol.' });

describe('PromptDefinition', () => {
  test('a schema annotated with a definition resolves to it', ({ expect }) => {
    const schedule = Schema.String.annotate(PromptDefinition.annotations(Cron));
    expect(PromptDefinition.fromAst(schedule.ast)).toEqual(Cron);
    expect(PromptDefinition.fromAst(Schema.String.ast)).toBeUndefined();
  });

  test('merge keeps the first definition for each id, in order', ({ expect }) => {
    const shadow = PromptDefinition.make({ ...Cron, text: 'Shadowed.' });
    expect(PromptDefinition.merge([Cron, Unit], [shadow, Unit])).toEqual([Cron, Unit]);
  });

  test('a toolkit lists the definitions its tools declare, each once', ({ expect }) => {
    const schedule = Tool.make('schedule', { parameters: Schema.Struct({ at: Schema.String }) }).annotate(
      PromptDefinition.ToolAnnotation,
      [Cron],
    );
    const measure = Tool.make('measure', { parameters: Schema.Struct({ unit: Schema.String }) }).annotate(
      PromptDefinition.ToolAnnotation,
      [Unit, Cron],
    );
    const plain = Tool.make('plain', { parameters: Schema.Struct({}) });

    expect(PromptDefinition.fromTool(plain)).toEqual([]);
    expect(PromptDefinition.fromToolkit(Toolkit.make(schedule, measure, plain))).toEqual([Cron, Unit]);
  });

  test('format renders one section, or nothing when there are no definitions', ({ expect }) => {
    expect(PromptDefinition.format([])).toBeUndefined();
    expect(PromptDefinition.format([Cron, Unit, Cron])).toBe(
      [
        '## Definitions',
        '<definition name="Cron">\nFive space-separated fields.\n</definition>',
        '<definition name="Unit">\nAn SI unit symbol.\n</definition>',
      ].join('\n\n'),
    );
  });
});
