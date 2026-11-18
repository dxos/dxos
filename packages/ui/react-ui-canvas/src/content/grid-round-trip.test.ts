//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap, Dsl, applyCommands } from '@dxos/diagram';

import { SceneHandler } from './handler.ts';

describe('grid round trip', () => {
  test('a grid keeps its kind, its tracks and every membership', ({ expect }) => {
    const source = [
      'object demo @ 0,0 scale=1 {',
      '  grid root 0,0 900x300 cols=3 gap=24 padding=24 stroke=dashed border=true {',
      '    rect a "One"',
      '    rect b "Two"',
      '    rect c "Three"',
      '  }',
      '}',
      '',
    ].join('\n');
    const content: ContentMap = {};
    applyCommands(content, Dsl.read(source).commands, SceneHandler);
    const printed = Dsl.print(SceneHandler.read(content).scene);
    expect(printed).toContain('grid root');
    expect(printed).toContain('cols=3');
    expect(printed).toContain('gap=24');
    expect(printed).toContain('padding=24');
    // Containment is the braces, so no child says `parent`: the two would otherwise be free to disagree.
    expect(printed).not.toContain('parent=');
    expect(printed).toEqual(source);
    // The children's frames are the rule's result, cached: re-solving them gives the same drawing.
    const again: ContentMap = {};
    applyCommands(again, Dsl.read(printed).commands, SceneHandler);
    expect(Dsl.print(SceneHandler.read(again).scene)).toEqual(printed);
  });
});
