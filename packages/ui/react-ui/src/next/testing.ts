//
// Copyright 2026 DXOS.org
//

import { expect, userEvent, waitFor, within } from 'storybook/test';

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

/** The `withSizes` row (`stories.tsx`) holding the story rendered at `size`. */
export const sizeRow = (root: HTMLElement, size: Size) => byTestId(root, `size-${size}`);

export const centreY = (rect: DOMRect) => rect.top + rect.height / 2;

export const centreX = (rect: DOMRect) => rect.left + rect.width / 2;

/**
 * The surface a popup is painted on: the popup itself, or the ScrollArea frame of a scrolling popup (Menu, Select,
 * Combobox), whose viewport is the Ark content.
 */
export const popupFrame = (popup: HTMLElement) => popup.closest<HTMLElement>('.nx-popup') ?? popup;

/** A popup's arrow part, if it renders one; a scrolling popup draws it in its frame, outside the clipping viewport. */
const arrowOf = (popup: HTMLElement) => popupFrame(popup).querySelector<HTMLElement>('[data-part="arrow"]');

/** The popup's box grown by its arrow, whose outer edge is the popup's edge facing the anchor. */
const withArrow = (popup: HTMLElement) => {
  const rect = popupFrame(popup).getBoundingClientRect();
  const arrow = arrowOf(popup)?.getBoundingClientRect();
  return {
    top: Math.min(rect.top, arrow?.top ?? rect.top),
    bottom: Math.max(rect.bottom, arrow?.bottom ?? rect.bottom),
  };
};

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
    const gap = withArrow(popup).top - anchorRect.bottom;
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

/**
 * Asserts `popup` shows an arrow in its own surface colour on the side facing `anchor`, within the anchor's span and
 * with its tip 0–3px (the gutter) from it; the popup body keeps the arrow's half-size further off.
 */
export const expectArrow = async (anchor: HTMLElement, popup: HTMLElement) => {
  const arrow = arrowOf(popup);
  await expect(arrow, 'arrow').not.toBeNull();
  const tip = arrow?.querySelector<HTMLElement>('[data-part="arrow-tip"]');
  await expect(tip && getComputedStyle(tip).backgroundColor).toBe(getComputedStyle(popupFrame(popup)).backgroundColor);
  await waitFor(async () => {
    const anchorRect = anchor.getBoundingClientRect();
    const popupRect = popupFrame(popup).getBoundingClientRect();
    const arrowRect = arrow?.getBoundingClientRect() ?? popupRect;
    const below = popupRect.top >= anchorRect.bottom;
    const tipGap = below ? arrowRect.top - anchorRect.bottom : anchorRect.top - arrowRect.bottom;
    const bodyGap = below ? popupRect.top - anchorRect.bottom : anchorRect.top - popupRect.bottom;
    const where = `arrow ${JSON.stringify(arrowRect)}, popup ${JSON.stringify(popupRect)}, anchor ${JSON.stringify(anchorRect)}`;
    await expect(tipGap >= 0 && tipGap <= 3, `tip gap ${tipGap}: ${where}`).toBe(true);
    await expect(bodyGap - tipGap, `arrow overhang: ${where}`).toBeCloseTo(arrowRect.height / 2, 0);
    // The rotated tip's corners touch the arrow box, so it overhangs neither the box nor the gutter.
    const tipRect = tip?.getBoundingClientRect();
    await expect(Math.abs((tipRect?.top ?? Number.NaN) - arrowRect.top) <= 0.5, `tip overhang: ${where}`).toBe(true);
    const centre = centreX(arrowRect);
    await expect(centre >= anchorRect.left && centre <= anchorRect.right, `arrow centre ${centre}: ${where}`).toBe(
      true,
    );
  });
};

/**
 * Asserts a long popup scrolls in a Next ScrollArea (DESIGN.md follow-up 49): its viewport (the Ark content) overflows,
 * shows no native bar, and keeps the highlighted item in view while ArrowDown walks `steps` items past the fold.
 */
export const expectScrollingPopup = async (popup: HTMLElement, steps: number) => {
  await expect(popup).toHaveClass('nx-scroll-viewport');
  // A direct child: a dev slot-warning wrapper in between would break the frame's child rules.
  await expect(popup.parentElement).toBe(popupFrame(popup));
  await expect(popup.scrollHeight, 'popup overflows').toBeGreaterThan(popup.clientHeight);
  await expect(getComputedStyle(popup).scrollbarWidth, 'no native scrollbar').toBe('none');
  for (let step = 0; step < steps; step++) {
    await userEvent.keyboard('{ArrowDown}');
  }
  await waitFor(async () => {
    const item = popup.querySelector<HTMLElement>('[data-highlighted]');
    await expect(item, 'highlighted item').not.toBeNull();
    const itemRect = item?.getBoundingClientRect() ?? new DOMRect();
    const viewRect = popup.getBoundingClientRect();
    const where = `item ${JSON.stringify(itemRect)}, viewport ${JSON.stringify(viewRect)}`;
    await expect(popup.scrollTop, `scrolled: ${where}`).toBeGreaterThan(0);
    await expect(itemRect.top >= viewRect.top - 0.5 && itemRect.bottom <= viewRect.bottom + 0.5, where).toBe(true);
  });
};

/** Hovers with a real pointer (the storybook runner's Playwright), since synthetic events never apply `:hover`. */
export const realHover = async (element: HTMLElement) => {
  const { userEvent: pointer } = await import('vitest/browser');
  await pointer.hover(element);
};

/** Moves the real pointer off `element` (to the page's top-left corner), so `pointerleave` and `:hover` follow. */
export const realUnhover = async (element: HTMLElement) => {
  const { userEvent: pointer } = await import('vitest/browser');
  await pointer.unhover(element);
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

/** Watches for `ms` and fails if any tooltip appears meanwhile, even briefly (a flash). */
export const expectNoTooltip = async (root: HTMLElement, ms = 500) => {
  const doc = root.ownerDocument;
  let seen = doc.querySelector('[role="tooltip"]') !== null;
  const observer = new MutationObserver(() => {
    seen ||= doc.querySelector('[role="tooltip"]') !== null;
  });
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true });
  await new Promise((resolve) => setTimeout(resolve, ms));
  observer.disconnect();
  await expect(seen, 'a tooltip appeared').toBe(false);
};

/** Waits for the one open tooltip to show `text` within the 2px gutter (+ rounding) of `trigger`, and returns it. */
export const expectTooltip = async (trigger: HTMLElement, text: string) => {
  const body = within(trigger.ownerDocument.body);
  await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent(text));
  const tooltip = body.getByRole('tooltip');
  await waitFor(() => {
    const anchor = trigger.getBoundingClientRect();
    const popup = withArrow(tooltip);
    const gap = Math.max(popup.top - anchor.bottom, anchor.top - popup.bottom);
    return expect(gap >= 0 && gap <= 3).toBe(true);
  });
  return tooltip;
};
