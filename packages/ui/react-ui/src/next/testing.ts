//
// Copyright 2026 DXOS.org
//

import { expect, waitFor, within } from 'storybook/test';

import { type Size } from './sizes.ts';

/** Expected geometry per size in px (decision 12); asserting literals checks the theme, not just self-consistency. */
export const GEOMETRY: Record<Size, { block: number; inset: number; icon: number }> = {
  xs: { block: 20, inset: 1, icon: 12 },
  sm: { block: 24, inset: 2, icon: 14 },
  md: { block: 32, inset: 2, icon: 16 },
  lg: { block: 40, inset: 3, icon: 20 },
  xl: { block: 48, inset: 3, icon: 24 },
};

/** Control height per size: the block less its inset on both sides. */
export const controlSize = (size: Size) => GEOMETRY[size].block - 2 * GEOMETRY[size].inset;

export const byTestId = (root: HTMLElement, testId: string) => {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`missing ${testId}`);
  }
  return element;
};

export const centreY = (rect: DOMRect) => rect.top + rect.height / 2;

/** Every themed part carries Ark's scope/part attributes (decision 10). */
export const expectScoped = async (root: HTMLElement) => {
  for (const part of root.querySelectorAll('[class*="nx-"]:not(.nx-scope)')) {
    await expect(part.hasAttribute('data-scope'), part.className).toBe(true);
  }
};

/** Icons without a label are decorative and hidden from assistive tech (decision 9). */
export const expectDecorativeIconsHidden = async (root: HTMLElement) => {
  for (const icon of root.querySelectorAll('svg[data-scope="icon"]:not([aria-label])')) {
    await expect(icon.getAttribute('aria-hidden')).toBe('true');
  }
};

/** Waits for the one open tooltip to show `text` within the 2px gutter (+ rounding) of `trigger`, and returns it. */
export const expectTooltip = async (trigger: HTMLElement, text: string) => {
  const body = within(trigger.ownerDocument.body);
  await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent(text));
  const tooltip = body.getByRole('tooltip');
  await waitFor(() => {
    const anchor = trigger.getBoundingClientRect();
    const popup = tooltip.getBoundingClientRect();
    const gap = Math.max(popup.top - anchor.bottom, anchor.top - popup.bottom);
    return expect(gap >= 0 && gap <= 3).toBe(true);
  });
  return tooltip;
};
