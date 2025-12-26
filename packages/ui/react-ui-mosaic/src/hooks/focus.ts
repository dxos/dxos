//
// Copyright 2025 DXOS.org
//

import { useFocusFinders, useFocusableGroup } from '@fluentui/react-tabster';
import { type KeyboardEventHandler, useCallback } from 'react';

import { invariant } from '@dxos/invariant';

// TODO(burdon): Factor out.
// TODO(burdon): Create storybook (with surfaces).

// https://storybooks.fluentui.dev/react/?path=/docs/concepts-introduction--page

/**
 * Attempts to fix Tabster's useFocusableGroup
 */
export const useFocusableGroupAlt = (element?: HTMLDivElement | null) => {
  const focusableGroupAttrs = useFocusableGroup();
  const { findFirstFocusable } = useFocusFinders();

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>((event) => {
    if (event.target === event.currentTarget) {
      invariant(element);
      switch (event.key) {
        case 'Enter': {
          findFirstFocusable(element)?.focus();
          break;
        }

        case 'Escape': {
          break;
        }
      }
    }
  }, []);

  return {
    ...focusableGroupAttrs,
    tabIndex: 0,
    onKeyDown: handleKeyDown,
  };
};

export type FocusableOpts = {
  /** If true, require tab order focusability (tabIndex >= 0). If false, allow tabindex="-1" (programmatic focus). */
  tabbableOnly?: boolean;
};

export function findFirstFocusableAncestor(
  root: Element,
  { tabbableOnly = false }: FocusableOpts = {},
): HTMLElement | null {
  let el: Element | null = root.parentElement;
  while (el && el !== document.body) {
    if (isFocusable(el, tabbableOnly)) {
      return el as HTMLElement;
    }

    el = el.parentElement;
  }

  return null;
}

export function findFirstFocusableDescendant(
  root: Element,
  { tabbableOnly = false }: FocusableOpts = {},
): HTMLElement | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) =>
      isFocusable(node as Element, tabbableOnly) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
  });

  return walker.nextNode() as HTMLElement | null;
}

function isFocusable(el: Element, tabbableOnly: boolean): boolean {
  if (!(el instanceof HTMLElement)) {
    return false;
  }

  // Exclude inert/hidden/disabled-ish.
  if (el.closest("[hidden], [aria-hidden='true']")) return false;
  if ((el as any).inert) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (!el.getClientRects().length) return false; // Also filters display:none + detached layout boxes.

  const ariaDisabled = el.getAttribute('aria-disabled') === 'true';
  if (ariaDisabled) return false;

  // Native focusables.
  const tag = el.tagName;
  const disabled = (el as any).disabled === true;

  if (!disabled) {
    if (tag === 'A') return (el as HTMLAnchorElement).hasAttribute('href');
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
    if (tag === 'SUMMARY') return true;
    if (tag === 'IFRAME') return true;
    if (el.isContentEditable) return true;
  }

  // tabindex-based focusables.
  const tabindexAttr = el.getAttribute('tabindex');
  if (tabindexAttr != null) {
    const n = Number(tabindexAttr);
    if (Number.isNaN(n)) return false;
    return tabbableOnly ? n >= 0 : n >= -1; // any tabindex makes it focusable; >=0 makes it tabbable.
  }

  // Programmatic focus via focus() without tabindex is not reliable across elements => treat as not focusable.
  return false;
}
