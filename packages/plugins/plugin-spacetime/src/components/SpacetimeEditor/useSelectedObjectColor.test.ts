//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';

import { Model, Scene } from '#types';

import { type UseSelectedObjectColorOptions, useSelectedObjectColor } from './useSelectedObjectColor.ts';

describe('useSelectedObjectColor', () => {
  test('selecting an object adopts its colour', ({ expect }) => {
    const { object, picker, render } = setup('red', 'blue');
    render();
    expect(picker.hue).toBe('red');
    expect(object.color).toBe('red');
  });

  test('changing the picker writes the selected object', ({ expect }) => {
    const { object, props, render } = setup('red');
    const hook = render();
    hook.rerender(props({ hue: 'green' }));
    expect(object.color).toBe('green');
  });

  test('a colour change right after selecting an object of the same colour is saved', ({ expect }) => {
    const { object, picker, props, render } = setup('blue');
    // Nothing selected, then the object, whose colour already matches the picker.
    const hook = render({ selectedObjectId: null });
    hook.rerender(props());
    expect(picker.hue).toBe('blue');

    hook.rerender(props({ hue: 'green' }));
    expect(object.color).toBe('green');
  });
});

/** A scene with one coloured object and a picker the hook drives; `props` builds the hook's options. */
const setup = (color: string, hue = color) => {
  const object = Model.make({ color });
  const scene = Obj.make(Scene.Scene, { objects: [Ref.make(object)] });
  const picker = { hue };
  const props = (overrides: Partial<UseSelectedObjectColorOptions> = {}): UseSelectedObjectColorOptions => ({
    scene,
    selectedObjectId: object.id,
    hue: picker.hue,
    onHueChange: (next) => {
      picker.hue = next;
    },
    ...overrides,
  });
  const render = (overrides: Partial<UseSelectedObjectColorOptions> = {}) =>
    renderHook((options: UseSelectedObjectColorOptions) => useSelectedObjectColor(options), {
      initialProps: props(overrides),
    });
  return { object, picker, props, render };
};
