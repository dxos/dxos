//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';

import { blank } from '../templates';

import * as Automation from './Automation';
import * as Runnable from './Runnable';

describe('Automation', () => {
  test('make produces a typed Automation', ({ expect }) => {
    const automation = Automation.make({ name: 'Test', triggers: [] });
    expect(Automation.instanceOf(automation)).toBe(true);
    expect(Obj.instanceOf(Automation.Automation, automation)).toBe(true);
    expect(Type.getTypename(Automation.Automation)).toBe('org.dxos.type.automation');
    expect(Obj.getLabel(automation)).toBe('Test');
    expect(automation.triggers).toEqual([]);
    expect(automation.runnable).toBeUndefined();
  });

  test('Runnable seam is currently the Operation type', ({ expect }) => {
    // MVP: Runnable === Operation. Widening this to a union is the documented next step.
    expect(Runnable.Runnable).toBe(Operation.PersistentOperation);
  });

  describe('blank template', () => {
    test('is the default no-op template', ({ expect }) => {
      expect(blank.id).toBe('org.dxos.automation.blank');
      expect(blank.label).toBe('Blank');
      expect(typeof blank.scaffold).toBe('function');
    });
  });
});
