//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from './OrderedList.stories';

const { Default } = composeStories(stories);

describe('OrderedList', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders all items', () => {
    render(<Default />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  test('clicking a title expands and collapses it', () => {
    render(<Default />);
    expect(screen.queryByTestId('panel-a')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Alpha'));
    expect(screen.getByTestId('panel-a')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Alpha'));
    expect(screen.queryByTestId('panel-a')).not.toBeInTheDocument();
  });

  test('expanding one collapses the previously expanded (single-expand)', () => {
    render(<Default />);
    fireEvent.click(screen.getByText('Alpha'));
    expect(screen.getByTestId('panel-a')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Bravo'));
    expect(screen.queryByTestId('panel-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('panel-b')).toBeInTheDocument();
  });

  test('caret toggles expansion', () => {
    render(<Default />);
    const row = screen.getByText('Charlie').closest('[role="listitem"]')!;
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: /toggle-expand/i }));
    expect(screen.getByTestId('panel-c')).toBeInTheDocument();
  });

  test('delete removes the item', () => {
    render(<Default />);
    fireEvent.click(screen.getByTestId('delete-b'));
    expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
