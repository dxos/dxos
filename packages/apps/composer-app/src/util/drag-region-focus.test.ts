//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, test } from 'vitest';

import { restoreDragRegionFocus } from './drag-region-focus.ts';

// Mirrors Tauri's drag script, which cancels the default action of a drag-region mousedown.
const cancelDrag = (event: MouseEvent) => event.preventDefault();

const mount = () => {
  const pane = document.createElement('div');
  pane.tabIndex = 0;
  const toolbar = document.createElement('div');
  toolbar.setAttribute('data-tauri-drag-region', 'deep');
  const title = document.createElement('h1');
  const button = document.createElement('button');
  const group = document.createElement('div');
  group.tabIndex = -1;
  const label = document.createElement('span');
  group.append(label);
  toolbar.append(title, button, group);
  pane.append(toolbar);
  const outside = document.createElement('input');
  document.body.append(pane, outside);
  return { pane, title, button, group, label, outside };
};

const press = (element: Element) =>
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));

describe('restoreDragRegionFocus', () => {
  let dispose: () => void;
  beforeEach(() => {
    dispose = restoreDragRegionFocus();
    document.addEventListener('mousedown', cancelDrag);
  });
  afterEach(() => {
    dispose();
    document.removeEventListener('mousedown', cancelDrag);
    document.body.replaceChildren();
  });

  test('focuses the pane around a dragged header', ({ expect }) => {
    const { pane, title, outside } = mount();
    outside.focus();
    press(title);
    expect(document.activeElement).toBe(pane);
  });

  test('focuses a tabindex=-1 element inside the region, which still drags', ({ expect }) => {
    const { group, label, outside } = mount();
    outside.focus();
    press(label);
    expect(document.activeElement).toBe(group);
  });

  test('leaves a control inside the region to the browser', ({ expect }) => {
    const { button, outside } = mount();
    outside.focus();
    press(button);
    expect(document.activeElement).toBe(outside);
  });

  test.for([
    { attr: '', hitSelf: true, focused: true },
    { attr: 'true', hitSelf: true, focused: true },
    { attr: '', hitSelf: false, focused: false },
    { attr: 'false', hitSelf: true, focused: false },
  ])('region "$attr", hit on itself: $hitSelf → focused: $focused', ({ attr, hitSelf, focused }, { expect }) => {
    const pane = document.createElement('div');
    pane.tabIndex = 0;
    const region = document.createElement('div');
    region.setAttribute('data-tauri-drag-region', attr);
    const child = document.createElement('span');
    region.append(child);
    pane.append(region);
    const outside = document.createElement('input');
    document.body.append(pane, outside);
    outside.focus();
    press(hitSelf ? region : child);
    expect(document.activeElement).toBe(focused ? pane : outside);
  });

  test('a control carrying the attribute is a region', ({ expect }) => {
    const pane = document.createElement('div');
    pane.tabIndex = 0;
    const control = document.createElement('div');
    control.setAttribute('role', 'button');
    control.setAttribute('data-tauri-drag-region', 'deep');
    pane.append(control);
    const outside = document.createElement('input');
    document.body.append(pane, outside);
    outside.focus();
    press(control);
    expect(document.activeElement).toBe(pane);
  });
});
