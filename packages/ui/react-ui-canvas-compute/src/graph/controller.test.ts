//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';

import { createBasicCircuit } from '../testing/index.ts';
import { createStoryRuntime } from '../testing/services.ts';
import { createComputeGraphController } from './controller.ts';

describe('ComputeGraphController', () => {
  test('a switch turned on lights the beacon it feeds', async ({ expect }) => {
    const { controller, graph } = createComputeGraphController(createBasicCircuit(), createStoryRuntime());
    await controller.open();
    const computeIdOf = (type: string): string => {
      const node = graph.nodes.find((node) => node.type === type)?.node;
      if (!node) {
        throw new Error(`no ${type} node`);
      }
      return node;
    };
    const updated = controller.update.waitForCount(1);
    controller.setOutput(computeIdOf('switch'), DEFAULT_OUTPUT, true);
    await updated;
    expect(controller.getInputs(computeIdOf('beacon'))[DEFAULT_INPUT]).toEqual({ type: 'executed', value: true });
    await controller.close();
  });
});
