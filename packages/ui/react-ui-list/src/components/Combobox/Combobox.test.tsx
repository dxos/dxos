//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react-vite';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { ThemeProvider, Toolbar, defaultTx } from '@dxos/react-ui';

import { Combobox } from './Combobox';
import * as stories from './Combobox.stories';

const { Default, Multiple } = composeStories(stories);

const openPopover = () => fireEvent.click(screen.getByRole('combobox'));

const option = (label: string) => screen.getByRole('option', { name: new RegExp(label) });

describe('Combobox', () => {
  afterEach(() => {
    cleanup();
  });

  describe('single', () => {
    test('choosing an option commits it and closes the popover', () => {
      render(<Default />);
      openPopover();
      const label = screen.getAllByRole('option')[0].textContent!;
      fireEvent.click(option(label));
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveTextContent(label);
    });

    test('the list is not multi-selectable', () => {
      render(<Default />);
      openPopover();
      expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-multiselectable');
    });
  });

  describe('multiple', () => {
    test('the story opens with its initial values chosen', () => {
      render(<Multiple />);
      openPopover();
      expect(screen.getAllByRole('option', { selected: true })).toHaveLength(2);
    });

    test('choosing an option adds it and keeps the popover open', () => {
      render(<Multiple />);
      openPopover();
      const unselected = screen.getAllByRole('option', { selected: false })[0];
      fireEvent.click(unselected);
      expect(screen.getAllByRole('option', { selected: true })).toHaveLength(3);
    });

    test('choosing a chosen option removes it', () => {
      render(<Multiple />);
      openPopover();
      fireEvent.click(screen.getAllByRole('option', { selected: true })[0]);
      expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1);
    });

    test('the list is marked multi-selectable', () => {
      render(<Multiple />);
      openPopover();
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    });

    test('the trigger summarizes the selection', () => {
      render(<Multiple />);
      openPopover();
      const chosen = screen.getAllByRole('option', { selected: true }).map((element) => element.textContent!);
      const trigger = screen.getByRole('combobox');
      for (const label of chosen) {
        expect(trigger).toHaveTextContent(label);
      }
    });
  });

  // `Content` renders in place, so a trigger inside a clipping container (a toolbar, a scroll area)
  // needs `Portal` — without it the popover opens but is invisible, which reads as a dead trigger.
  describe('portal', () => {
    const InToolbar = ({ portal }: { portal: boolean }) => {
      const [values, setValues] = useState<readonly string[]>([]);
      const content = (
        <Combobox.Content>
          <Combobox.List>
            <Combobox.Item value='a' label='Alpha' />
          </Combobox.List>
        </Combobox.Content>
      );
      return (
        <ThemeProvider tx={defaultTx} themeMode='dark'>
          <Toolbar.Root>
            <Combobox.Root multiple value={values} onValueChange={setValues}>
              <Combobox.Trigger>trigger</Combobox.Trigger>
              {portal ? <Combobox.Portal>{content}</Combobox.Portal> : content}
            </Combobox.Root>
          </Toolbar.Root>
        </ThemeProvider>
      );
    };

    test('unportalled content renders inside the clipping container', () => {
      render(<InToolbar portal={false} />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox').closest('[role="toolbar"]')).not.toBeNull();
    });

    test('portalled content escapes it', () => {
      render(<InToolbar portal />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox').closest('[role="toolbar"]')).toBeNull();
    });
  });

  // The keyboard cursor and the chosen options are separate states once a list is multi-select, so
  // they cannot share `aria-selected`: the cursor is addressed by the input's `aria-activedescendant`.
  test('the keyboard cursor is distinct from selection', () => {
    render(<Multiple />);
    openPopover();
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = input.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    const highlighted = document.querySelectorAll('[data-highlighted]');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].id).toBe(active);
    expect(highlighted[0].getAttribute('aria-selected')).toBe('false');
  });
});
