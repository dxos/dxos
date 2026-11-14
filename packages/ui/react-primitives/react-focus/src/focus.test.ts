//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test } from 'vitest';

import { findFirstFocusable, findLastFocusable } from './focus.ts';

const mount = (html: string): HTMLElement => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  return container;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('findFirstFocusable', () => {
  test('returns the first tabbable in document order, however deep', () => {
    const container = mount(
      '<div><section><span><button id="target">a</button></span></section><button>b</button></div>',
    );
    expect(findFirstFocusable(container)?.id).toEqual('target');
  });

  test('prefers a tabbable ancestor over the controls inside it', () => {
    const container = mount('<div tabindex="0" id="row"><button>inner</button></div>');
    expect(findFirstFocusable(container.firstElementChild as HTMLElement)?.tagName).toEqual('BUTTON');
    expect(findFirstFocusable(container)?.id).toEqual('row');
  });

  test('skips a disabled control but not the one after it', () => {
    const container = mount('<button disabled>a</button><button id="target">b</button>');
    expect(findFirstFocusable(container)?.id).toEqual('target');
  });

  test('ignores a negative tabindex', () => {
    const container = mount('<div tabindex="-1">a</div><button id="target">b</button>');
    expect(findFirstFocusable(container)?.id).toEqual('target');
  });

  test('never returns the container itself', () => {
    const container = mount('<span>no controls here</span>');
    container.tabIndex = 0;
    expect(findFirstFocusable(container)).toBeNull();
  });

  test('returns null when nothing inside is tabbable', () => {
    expect(findFirstFocusable(mount('<span>a</span><em>b</em>'))).toBeNull();
  });

  test('handles a missing container', () => {
    expect(findFirstFocusable(null)).toBeNull();
    expect(findFirstFocusable(undefined)).toBeNull();
  });

  // The walk this replaced never descended into a skipped subtree, so a control inside one is not
  // reachable however shallow it sits.
  describe('skipped subtrees', () => {
    test.for([
      ['inert', '<div inert><button>skipped</button></div>'],
      ['hidden', '<div hidden><button>skipped</button></div>'],
      ['aria-hidden', '<div aria-hidden="true"><button>skipped</button></div>'],
      ['a sentinel', '<div data-focus-sentinel="start"><button>skipped</button></div>'],
    ])('%s', ([, skipped]) => {
      const container = mount(`${skipped}<button id="target">real</button>`);
      expect(findFirstFocusable(container)?.id).toEqual('target');
    });

    test('applies to an ancestor several levels up', () => {
      const container = mount(
        '<div inert><section><span><button>skipped</button></span></section></div><button id="target">real</button>',
      );
      expect(findFirstFocusable(container)?.id).toEqual('target');
    });

    test('a skipped element is not returned even when it is itself tabbable', () => {
      const container = mount('<button aria-hidden="true">skipped</button><button id="target">real</button>');
      expect(findFirstFocusable(container)?.id).toEqual('target');
    });
  });
});

describe('findLastFocusable', () => {
  test('returns the last tabbable among siblings', () => {
    const container = mount('<button>a</button><button id="target">b</button>');
    expect(findLastFocusable(container)?.id).toEqual('target');
  });

  // Deliberately not reverse document order: a limited groupper is one tab stop, so the container
  // wins over the controls it holds.
  test('returns a tabbable subtree root rather than its last descendant', () => {
    const container = mount('<button>a</button><div tabindex="0" id="row"><button>inner</button></div>');
    expect(findLastFocusable(container)?.id).toEqual('row');
  });

  test('skips an excluded subtree', () => {
    const container = mount('<button id="target">a</button><div inert><button>skipped</button></div>');
    expect(findLastFocusable(container)?.id).toEqual('target');
  });
});
