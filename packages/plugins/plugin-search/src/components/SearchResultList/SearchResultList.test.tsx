//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { ThemeProvider } from '@dxos/react-ui';

import { type SearchResult } from '#types';

import { SearchResultList } from './SearchResultList';

// `Listbox.Viewport` renders a `ScrollArea`, which reads theme tokens via context.
const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider>{children}</ThemeProvider>;

const results: SearchResult[] = [
  {
    id: '1',
    label: 'Invoice #12345',
    snippet: 'Please pay invoice #12345 by Friday.',
    type: 'Message',
    icon: 'ph--envelope--regular',
  },
  {
    id: '2',
    label: 'Sprint planning notes',
    snippet: 'Discussed the invoice reconciliation process for the sprint.',
    type: 'Message',
    icon: 'ph--envelope--regular',
  },
];

describe('SearchResultList', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders a row for each result', () => {
    render(<SearchResultList results={results} query='invoice' />, { wrapper: Wrapper });
    // `getByText` throws if no match is found, which is assertion enough that the row rendered.
    expect(screen.getByText(/Sprint planning notes/)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('highlights the query term in both title and snippet', () => {
    const { container } = render(<SearchResultList results={[results[0]]} query='invoice' />, { wrapper: Wrapper });
    const marks = container.querySelectorAll('mark');
    // One match in the title ("Invoice") and one in the snippet ("invoice").
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect(Array.from(marks).some((mark) => mark.textContent?.toLowerCase() === 'invoice')).toBe(true);
  });

  test('renders metadata (type) alongside each result', () => {
    render(<SearchResultList results={results} query='invoice' />, { wrapper: Wrapper });
    expect(screen.getAllByText('Message')).toHaveLength(2);
  });

  test('renders no rows for an empty result set', () => {
    render(<SearchResultList results={[]} query='invoice' />, { wrapper: Wrapper });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
