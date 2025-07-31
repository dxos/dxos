//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Blueprint } from './blueprint';

describe('Blueprint', () => {
  it('should create a blueprint', ({ expect }) => {
    const blueprint = Obj.make(Blueprint, {
      key: 'dxos.org/blueprint/test',
      name: 'Test',
      instructions: {
        source: Ref.make(
          DataType.text(trim`
            Read the instructions.
          `),
        ),
      },
      tools: [],
    });

    expect(blueprint).to.exist;
  });
});
