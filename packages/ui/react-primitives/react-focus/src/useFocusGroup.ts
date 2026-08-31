//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, type FocusEvent as ReactFocusEvent, useCallback, useMemo, useRef } from 'react';

import {
  FOCUS_CURRENT_ATTR,
  FOCUS_GROUP_ATTR,
  FOCUS_MOVER_ATTR,
  FOCUS_SENTINEL_ATTR,
  FOCUS_TABBABLE_ATTR,
  type FocusGroupAxis,
  type FocusGroupTabBehavior,
  findFirstFocusable,
  findLastFocusable,
  findNextTabStop,
  getCurrentItem,
  getEntryTarget,
  getFocusItems,
  getTabExitBoundary,
  isEntered,
  isFocusGroup,
  isTabbable,
} from './focus';

export type FocusGroupKey = 'Tab' | 'Enter' | 'Escape';

export type UseFocusGroupOptions = {
  /**
   * Arrow-key axis. Omit for a group that does not move focus between its items.
   * `grid`, `grid-linear` and `both` step through items in DOM order on all four arrows.
   */
  axis?: FocusGroupAxis;
  /**
   * How `Tab` treats the group. Omit for a group that only moves focus with the arrow keys.
   * `unlimited` marks a boundary without limiting `Tab`, which is what makes a row holding its
   * own controls a single stop for an enclosing group's arrow navigation.
   */
  tabBehavior?: FocusGroupTabBehavior;
  /** Return focus to the last-focused item when the group is re-entered. */
  memorizeCurrent?: boolean;
  /** Wrap arrow navigation at the ends instead of stopping. */
  cyclic?: boolean;
  /** Keep every item individually reachable by `Tab` rather than making the group one stop. */
  tabbable?: boolean;
  /** Keys the group must leave alone because the consumer wires its own handling. */
  ignoreKeys?: FocusGroupKey[];
};

export type UseFocusGroupResult = {
  ref: (element: HTMLElement | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
  [FOCUS_GROUP_ATTR]?: FocusGroupTabBehavior;
  [FOCUS_MOVER_ATTR]?: FocusGroupAxis;
  [FOCUS_TABBABLE_ATTR]?: '';
};

const HORIZONTAL_KEYS = ['ArrowLeft', 'ArrowRight'];
const VERTICAL_KEYS = ['ArrowUp', 'ArrowDown'];
const BACKWARD_KEYS = ['ArrowUp', 'ArrowLeft'];

/** Keys the browser gives to a text field; the group must not take them back. */
const isTextEntry = (element: HTMLElement): boolean =>
  element.isContentEditable ||
  element.tagName === 'TEXTAREA' ||
  element.tagName === 'SELECT' ||
  (element.tagName === 'INPUT' &&
    !['button', 'checkbox', 'radio', 'submit', 'reset'].includes((element as HTMLInputElement).type));

const createSentinel = (document: Document, position: 'start' | 'end'): HTMLElement => {
  const sentinel = document.createElement('i');
  sentinel.setAttribute(FOCUS_SENTINEL_ATTR, position);
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.tabIndex = 0;
  // Out of flow so it cannot become a flex or grid item, and unpaintable so it cannot be seen.
  sentinel.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  return sentinel;
};

/** Where focus goes when the group's contents are entered: the memorized item, else the first. */
const contentEntry = (container: HTMLElement): HTMLElement | null => {
  const current = getCurrentItem(container);
  if (current) {
    return isTabbable(current) ? current : getEntryTarget(current);
  }
  return findFirstFocusable(container);
};

/** The nested group between `target` and `container` that currently owns focus, if any. */
const enteredNestedGroup = (container: HTMLElement, target: HTMLElement): HTMLElement | null => {
  let element: HTMLElement | null = target.parentElement;
  while (element && element !== container) {
    if (isFocusGroup(element) && isEntered(element)) {
      return element;
    }
    element = element.parentElement;
  }
  return null;
};

/**
 * Composite-widget focus management: arrow-key navigation across a container's items (a mover) and
 * a `Tab` boundary around them (a groupper). Replaces `@fluentui/react-tabster`'s
 * `useArrowNavigationGroup` / `useFocusableGroup` / `useMergedTabsterAttributes_unstable`, whose
 * runtime cost 68 KB of the eager boot graph.
 *
 * Unlike tabster these are real React props rather than `data-tabster` attributes interpreted by a
 * global runtime, so the returned `ref` must be composed and the handlers chained by the consumer.
 */
export const useFocusGroup = ({
  axis,
  tabBehavior,
  memorizeCurrent = false,
  cyclic = false,
  tabbable = false,
  ignoreKeys,
}: UseFocusGroupOptions = {}): UseFocusGroupResult => {
  const containerRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const sentinelsRef = useRef<{ first: HTMLElement; last: HTMLElement } | undefined>(undefined);
  // Set while focus is parked on a sentinel deliberately, so its handler does not undo the move.
  const inTransitRef = useRef(false);

  // Read through a ref so the handlers stay referentially stable across option changes.
  const optionsRef = useRef({ axis, tabBehavior, memorizeCurrent, cyclic, tabbable, ignoreKeys });
  optionsRef.current = { axis, tabBehavior, memorizeCurrent, cyclic, tabbable, ignoreKeys };

  const isGroupper = tabBehavior === 'limited' || tabBehavior === 'limited-trap-focus';
  // A group is only worth a boundary when something has to be intercepted there: a limited
  // groupper's entry, or a mover's memorized entry point.
  const needsSentinels = isGroupper || (!!axis && !tabbable);

  const handleSentinelFocus = useCallback((event: FocusEvent) => {
    const container = containerRef.current;
    const sentinel = event.currentTarget as HTMLElement;
    if (!container || inTransitRef.current) {
      return;
    }

    const { tabBehavior } = optionsRef.current;
    const trap = tabBehavior === 'limited-trap-focus';
    const groupper = trap || tabBehavior === 'limited';
    const start = sentinel.getAttribute(FOCUS_SENTINEL_ATTR) === 'start';
    const from = event.relatedTarget as HTMLElement | null;

    let target: HTMLElement | null;
    if (from === container) {
      // `Tab` from the container itself: the container is the group's stop, so leave it.
      target = findNextTabStop(getTabExitBoundary(container), !start);
    } else if (from && container.contains(from)) {
      if (trap) {
        target = start ? findLastFocusable(container) : findFirstFocusable(container);
      } else if (groupper && start) {
        // Tabbing backwards out of the contents collapses onto the container.
        target = container;
      } else {
        target = findNextTabStop(getTabExitBoundary(container), start);
      }
    } else {
      target = getEntryTarget(container, !start);
    }

    if (target) {
      target.focus();
    } else {
      // Nothing to hand focus to; the sentinel must not keep it.
      sentinel.blur();
    }
  }, []);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      containerRef.current = element;
      if (!element || !needsSentinels) {
        return;
      }

      const document = element.ownerDocument;
      const first = createSentinel(document, 'start');
      const last = createSentinel(document, 'end');
      const place = () => {
        if (element.firstChild !== first) {
          element.insertBefore(first, element.firstChild);
        }
        if (element.lastChild !== last) {
          element.appendChild(last);
        }
      };

      place();
      sentinelsRef.current = { first, last };
      first.addEventListener('focus', handleSentinelFocus);
      last.addEventListener('focus', handleSentinelFocus);
      // React appends new children after the trailing sentinel, which would let `Tab` past it.
      const observer = new MutationObserver(place);
      observer.observe(element, { childList: true });

      cleanupRef.current = () => {
        sentinelsRef.current = undefined;
        observer.disconnect();
        first.removeEventListener('focus', handleSentinelFocus);
        last.removeEventListener('focus', handleSentinelFocus);
        first.remove();
        last.remove();
      };
    },
    [needsSentinels, handleSentinelFocus],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container || event.defaultPrevented) {
      return;
    }

    const { axis, tabBehavior, cyclic, tabbable, ignoreKeys } = optionsRef.current;
    const ignored = (key: FocusGroupKey) => !!ignoreKeys?.includes(key);
    // Enter and Escape belong to any group; only a limited one takes Tab away from its contents.
    const groupper = !!tabBehavior;
    const limited = tabBehavior === 'limited' || tabBehavior === 'limited-trap-focus';
    const target = event.target as HTMLElement;
    const onContainer = target === container;

    // A nested group holding focus owns its own keys; stepping its rows would step out from under it.
    if (!onContainer && enteredNestedGroup(container, target)) {
      return;
    }

    if (event.key === 'Enter') {
      if (groupper && onContainer && !ignored('Enter')) {
        const entry = contentEntry(container);
        if (entry) {
          event.preventDefault();
          entry.focus();
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      if (groupper && !onContainer && !ignored('Escape')) {
        event.preventDefault();
        event.stopPropagation();
        container.focus();
      }
      return;
    }

    if (event.key === 'Tab') {
      // A trap's edges are handled by its sentinels; a groupper's contents tab out through them.
      if (axis && !tabbable && !limited && !onContainer && !ignored('Tab')) {
        // Park focus on the boundary and let the browser tab onward from there, so a mover is one
        // stop without this having to answer where the next one is — including at the end of the
        // document, where the answer is the browser's own chrome.
        const sentinels = sentinelsRef.current;
        if (sentinels) {
          inTransitRef.current = true;
          (event.shiftKey ? sentinels.first : sentinels.last).focus();
          inTransitRef.current = false;
        } else {
          const next = findNextTabStop(getTabExitBoundary(container), event.shiftKey);
          if (next) {
            event.preventDefault();
            next.focus();
          }
        }
      }
      return;
    }

    if (!axis || isTextEntry(target)) {
      return;
    }

    const horizontal = axis !== 'vertical';
    const vertical = axis !== 'horizontal';
    const arrow =
      (horizontal && HORIZONTAL_KEYS.includes(event.key)) || (vertical && VERTICAL_KEYS.includes(event.key));
    if (!arrow && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    const items = getFocusItems(container);
    if (items.length === 0) {
      return;
    }

    const focus = (item: HTMLElement | undefined) => {
      const next = item && (isTabbable(item) ? item : getEntryTarget(item));
      if (next) {
        event.preventDefault();
        next.focus();
      }
    };

    if (event.key === 'Home' || event.key === 'End') {
      focus(event.key === 'Home' ? items[0] : items[items.length - 1]);
      return;
    }

    if (onContainer) {
      focus(contentEntry(container) ?? items[0]);
      return;
    }

    const index = items.findIndex((item) => item === target || item.contains(target));
    if (index < 0) {
      return;
    }

    const next = index + (BACKWARD_KEYS.includes(event.key) ? -1 : 1);
    focus(cyclic ? items[(next + items.length) % items.length] : items[next]);
  }, []);

  const handleFocus = useCallback((event: ReactFocusEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container || !optionsRef.current.memorizeCurrent) {
      return;
    }

    const items = getFocusItems(container);
    const current = items.find((item) => item === event.target || item.contains(event.target));
    if (current) {
      for (const item of items) {
        if (item !== current) {
          item.removeAttribute(FOCUS_CURRENT_ATTR);
        }
      }
      current.setAttribute(FOCUS_CURRENT_ATTR, '');
    }
  }, []);

  return useMemo(
    () => ({
      ref,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      ...(tabBehavior && { [FOCUS_GROUP_ATTR]: tabBehavior }),
      ...(axis && { [FOCUS_MOVER_ATTR]: axis }),
      ...(axis && tabbable && { [FOCUS_TABBABLE_ATTR]: '' as const }),
    }),
    [ref, handleKeyDown, handleFocus, tabBehavior, axis, tabbable],
  );
};
