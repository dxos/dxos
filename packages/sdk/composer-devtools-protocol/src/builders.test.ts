//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { action, debug, input, select, stack, withRenderContext, type RenderContext } from './builders';

const noopContext = (): RenderContext => {
  let counter = 0;
  const next = () => `id-${++counter}`;
  return {
    registerAction: () => next(),
    registerInput: () => next(),
    registerSelect: () => next(),
  };
};

describe('builders', () => {
  test('produces a serializable tree', ({ expect }) => {
    const tree = withRenderContext(noopContext(), () =>
      stack({ direction: 'vertical' }, [
        action({ name: 'go' }, () => {}),
        debug({ value: { ok: true }, label: 'state' }),
        input({ name: 'filter', value: '' }, () => {}),
        select({ name: 'mode', value: 'a', options: [{ label: 'A', value: 'a' }] }, () => {}),
      ]),
    );

    expect(JSON.parse(JSON.stringify(tree))).toEqual({
      type: 'stack',
      props: { direction: 'vertical' },
      children: [
        { type: 'action', id: 'id-1', props: { name: 'go' } },
        { type: 'debug', props: { value: { ok: true }, label: 'state' } },
        { type: 'input', id: 'id-2', props: { name: 'filter', value: '' } },
        {
          type: 'select',
          id: 'id-3',
          props: { name: 'mode', value: 'a', options: [{ label: 'A', value: 'a' }] },
        },
      ],
    });
  });

  test('throws outside a render context', ({ expect }) => {
    expect(() => action({ name: 'x' }, () => {})).toThrow();
  });
});
