//
// Copyright 2026 DXOS.org
//

import { act, render, screen } from '@testing-library/react';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { useLayoutEffect } from 'react';
import { describe, test } from 'vitest';

import { type Attention, AttentionManager } from '../../types/Attention.ts';
import { AttentionContextProvider, UNKNOWN_ATTENDABLE, useAttended, useAttention } from './attention-context.ts';
import { AttendableContainer, RootAttentionProvider } from './AttentionProvider.tsx';

describe('useAttention', () => {
  test('reads the manager current state on the first render, not the UNKNOWN placeholder', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    attention.update(['a']);

    const values: Attention[] = [];
    render(
      <AttentionContextProvider attention={attention}>
        <AttentionProbe id='a' values={values} />
      </AttentionContextProvider>,
    );

    expect(values.length).toBeGreaterThan(0);
    expect(values[0]).to.deep.equal(attention.get('a'));
    expect(values[0]).to.not.deep.equal(UNKNOWN_ATTENDABLE);
  });

  test('updates synchronously when attention.update() is called inside act', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);

    const values: Attention[] = [];
    render(
      <AttentionContextProvider attention={attention}>
        <AttentionProbe id='a' values={values} />
      </AttentionContextProvider>,
    );
    expect(values.at(-1)).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });

    act(() => {
      attention.update(['a']);
    });
    expect(values.at(-1)).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
  });
});

describe('useAttended', () => {
  test('reads getCurrent() on the first render and follows updates', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry, ['x']);

    const values: (readonly string[])[] = [];
    render(
      <AttentionContextProvider attention={attention}>
        <AttendedProbe values={values} />
      </AttentionContextProvider>,
    );
    expect(values[0]).to.deep.equal(['x']);

    act(() => {
      attention.update(['y']);
    });
    expect(values.at(-1)).to.deep.equal(['y']);
  });
});

describe('focus-before-paint regression guard', () => {
  test('attention reflects focus moved during a layout effect, synchronously, before any paint', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);

    const Harness = () => (
      <>
        <AttendableContainer id='a' tabIndex={0} data-testid='a' />
        <AttendableContainer id='b' tabIndex={0} data-testid='b'>
          <FocusOnMount selector='[data-testid="b"]' />
        </AttendableContainer>
      </>
    );

    render(
      <RootAttentionProvider attention={attention}>
        <Harness />
      </RootAttentionProvider>,
    );

    // Synchronous, with no `waitFor`: they have to agree before the task that mounted the tree ends, or
    // the first painted frame is wrong.
    expect(attention.getCurrent()).to.deep.equal(['b']);
    expect(screen.getByTestId('b').getAttribute('data-w-attention-source')).toBe('true');
    expect(screen.getByTestId('a').getAttribute('data-w-attention-source')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('b'));
  });
});

describe('switching attendableId', () => {
  test('reads the new id state on the very render that changes it, never the UNKNOWN placeholder', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    attention.update(['a']);
    attention.update(['b']);

    const values: Attention[] = [];
    const { rerender } = render(
      <AttentionContextProvider attention={attention}>
        <AttentionProbe id='a' values={values} />
      </AttentionContextProvider>,
    );
    expect(values.at(-1)).to.deep.equal(attention.get('a'));

    rerender(
      <AttentionContextProvider attention={attention}>
        <AttentionProbe id='b' values={values} />
      </AttentionContextProvider>,
    );
    expect(values.at(-1)).to.deep.equal(attention.get('b'));
    expect(values.at(-1)).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });

    // Both ids are resolvable from a live manager, so the placeholder should never appear.
    expect(values.every((value) => value !== UNKNOWN_ATTENDABLE)).toBe(true);
  });
});

/** Records every value the hook returns across renders, including the very first one. */
const AttentionProbe = ({ id, values }: { id: string; values: Attention[] }) => {
  const state = useAttention(id);
  values.push(state);
  return null;
};

const AttendedProbe = ({ values }: { values: (readonly string[])[] }) => {
  const current = useAttended();
  values.push(current);
  return null;
};

/**
 * Focuses the element matching `selector` during the layout phase, as a plank does on mount. A DOM query
 * rather than a ref, since React attaches a host element's ref only after its descendants' layout
 * effects have run.
 */
const FocusOnMount = ({ selector }: { selector: string }) => {
  useLayoutEffect(() => {
    document.querySelector<HTMLElement>(selector)?.focus();
  }, [selector]);
  return null;
};
