//
// Copyright 2026 DXOS.org
//

import { cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { FOCUS_CURRENT_ATTR, getEntryTarget } from './focus.ts';
import { type UseFocusGroupOptions, useFocusGroup } from './useFocusGroup.ts';

const Group = ({ options, rows = 3 }: { options: UseFocusGroupOptions; rows?: number }) => {
  const { ref, ...props } = useFocusGroup(options);
  return (
    <div {...props} data-testid='group' tabIndex={0} ref={ref}>
      {Array.from({ length: rows }).map((_, index) => (
        <button key={index} data-testid={`item-${index}`}>
          {index}
        </button>
      ))}
    </div>
  );
};

/** A row that holds its own controls, so the outer group must treat it as one stop. */
const NestedGroup = () => {
  const { ref: outerRef, ...outerProps } = useFocusGroup({ axis: 'vertical' });
  const { ref: rowRef, ...rowProps } = useFocusGroup({ tabBehavior: 'limited' });
  return (
    <div {...outerProps} data-testid='group' ref={outerRef}>
      <div {...rowProps} tabIndex={0} data-testid='row-0' ref={rowRef}>
        <button data-testid='row-0-action'>action</button>
      </div>
      <div tabIndex={0} data-testid='row-1' />
    </div>
  );
};

describe('useFocusGroup', () => {
  afterEach(cleanup);

  test('arrow keys move between items on the axis, and stop at the ends', () => {
    const { getByTestId } = render(<Group options={{ axis: 'vertical' }} />);
    getByTestId('item-0').focus();

    fireEvent.keyDown(getByTestId('item-0'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(getByTestId('item-1'));

    fireEvent.keyDown(getByTestId('item-1'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(getByTestId('item-0'));

    fireEvent.keyDown(getByTestId('item-0'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(getByTestId('item-0'));
  });

  test('the off-axis arrows are left to the browser', () => {
    const { getByTestId } = render(<Group options={{ axis: 'vertical' }} />);
    getByTestId('item-0').focus();

    fireEvent.keyDown(getByTestId('item-0'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(getByTestId('item-0'));
  });

  test('cyclic navigation wraps at the ends', () => {
    const { getByTestId } = render(<Group options={{ axis: 'horizontal', cyclic: true }} />);
    getByTestId('item-0').focus();

    fireEvent.keyDown(getByTestId('item-0'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(getByTestId('item-2'));
  });

  test('Home and End reach the edges', () => {
    const { getByTestId } = render(<Group options={{ axis: 'vertical' }} />);
    getByTestId('item-1').focus();

    fireEvent.keyDown(getByTestId('item-1'), { key: 'End' });
    expect(document.activeElement).toBe(getByTestId('item-2'));

    fireEvent.keyDown(getByTestId('item-2'), { key: 'Home' });
    expect(document.activeElement).toBe(getByTestId('item-0'));
  });

  test('a limited group is entered with Enter and left with Escape', () => {
    const { getByTestId } = render(<Group options={{ tabBehavior: 'limited' }} />);
    const group = getByTestId('group');
    group.focus();

    fireEvent.keyDown(group, { key: 'Enter' });
    expect(document.activeElement).toBe(getByTestId('item-0'));

    fireEvent.keyDown(getByTestId('item-0'), { key: 'Escape' });
    expect(document.activeElement).toBe(group);
  });

  test('memorizeCurrent makes the last-focused item the entry point', () => {
    const { getByTestId } = render(<Group options={{ axis: 'vertical', memorizeCurrent: true }} />);
    fireEvent.focus(getByTestId('item-1'), { target: getByTestId('item-1') });

    expect(getByTestId('item-1').hasAttribute(FOCUS_CURRENT_ATTR)).toBe(true);
    expect(getEntryTarget(getByTestId('group'))).toBe(getByTestId('item-1'));
  });

  test('a nested group is a single stop for the enclosing arrow navigation', () => {
    const { getByTestId } = render(<NestedGroup />);
    getByTestId('row-0').focus();

    fireEvent.keyDown(getByTestId('row-0'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(getByTestId('row-1'));
  });

  test('an entered nested group keeps its own arrow keys', () => {
    const { getByTestId } = render(<NestedGroup />);
    getByTestId('row-0-action').focus();

    fireEvent.keyDown(getByTestId('row-0-action'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(getByTestId('row-0-action'));
  });

  test('a text field keeps its own arrow keys', () => {
    const { getByTestId } = render(
      <div>
        <TextGroup />
      </div>,
    );
    getByTestId('field').focus();

    fireEvent.keyDown(getByTestId('field'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(getByTestId('field'));
  });
});

const TextGroup = () => {
  const { ref, ...props } = useFocusGroup({ axis: 'vertical' });
  return (
    <div {...props} ref={ref}>
      <input data-testid='field' />
      <button data-testid='after'>after</button>
    </div>
  );
};
