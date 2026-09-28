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

export const centreX = (rect: DOMRect) => rect.left + rect.width / 2;

/** Floating UI's default `overflowPadding`: a popup is shifted to keep this far from the viewport edge. */
const OVERFLOW_PADDING = 8;

/**
 * Waits until `popup` sits 0–3px below `anchor` (the 2px gutter plus rounding) with its start edge or centre aligned
 * to the anchor's, allowing only the shift that keeps it inside the viewport; an unpositioned popup sits at the
 * viewport origin and fails.
 */
export const expectAnchoredBelow = async (
  anchor: HTMLElement,
  popup: HTMLElement,
  align: 'start' | 'center' = 'start',
) => {
  await waitFor(async () => {
    const anchorRect = anchor.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const gap = popupRect.top - anchorRect.bottom;
    const ideal = align === 'start' ? anchorRect.left : centreX(anchorRect) - popupRect.width / 2;
    const maxLeft = popup.ownerDocument.documentElement.clientWidth - OVERFLOW_PADDING - popupRect.width;
    const expected = Math.min(Math.max(ideal, OVERFLOW_PADDING), maxLeft);
    const where = `popup ${JSON.stringify(popupRect)}, anchor ${JSON.stringify(anchorRect)}`;
    await expect(gap >= 0 && gap <= 3, `gap ${gap}: ${where}`).toBe(true);
    await expect(Math.abs(popupRect.left - expected) <= 1, `left ${popupRect.left} != ${expected}: ${where}`).toBe(
      true,
    );
  });
};

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
