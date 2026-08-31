//
// Copyright 2026 DXOS.org
//

/**
 * DOM primitives behind `useFocusGroup`: focusable-element queries plus a tab-order walker that
 * understands the group boundaries the hook marks up.
 *
 * These replace `@fluentui/react-tabster`, whose Mover/Groupper runtime cost 68 KB of the eager
 * boot graph for the four hooks this repo used (`.agents/projects/ark/TASKS.md` Phase 5).
 */

/** Marks a composite-widget container; the value is its `Tab` behaviour. */
export const FOCUS_GROUP_ATTR = 'data-focus-group';

/** Marks an arrow-key navigation container; the value is its axis. */
export const FOCUS_MOVER_ATTR = 'data-focus-mover';

/** Marks the mover item focus returns to when the group is re-entered. */
export const FOCUS_CURRENT_ATTR = 'data-focus-current';

/** Marks a group's boundary elements; the value is `start` or `end`. */
export const FOCUS_SENTINEL_ATTR = 'data-focus-sentinel';

/** Marks a mover whose items stay individually reachable by `Tab`. */
export const FOCUS_TABBABLE_ATTR = 'data-focus-tabbable';

export type FocusGroupTabBehavior =
  /** The container is one stop among its own contents; `Tab` reaches everything inside. */
  | 'unlimited'
  /** `Tab` stops on the container; `Enter` moves inside, `Escape` back out, `Tab` inside leaves. */
  | 'limited'
  /** As `limited`, but `Tab` inside cycles rather than leaving; only `Escape` gets out. */
  | 'limited-trap-focus';

/** Arrow-key axes. `grid` and `both` move through items in DOM order on all four arrows. */
export type FocusGroupAxis = 'vertical' | 'horizontal' | 'grid' | 'grid-linear' | 'both';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
  '[contenteditable="true"]',
  'details > summary',
  'audio[controls]',
  'video[controls]',
].join(',');

const isSentinel = (element: Element): boolean => element.hasAttribute(FOCUS_SENTINEL_ATTR);

/** A subtree the browser skips wholesale, so neither may we. */
const isExcluded = (element: Element): boolean =>
  element.hasAttribute('inert') || element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true';

// A test DOM has no layout at all, so a rendered-ness test there would reject every element.
// Only `true` is memoized, so a document measured before its first layout is measured again.
const documentsWithLayout = new WeakMap<Document, boolean>();
const hasLayout = (document: Document): boolean => {
  let value = documentsWithLayout.get(document);
  if (value !== true) {
    value = document.body.getClientRects().length > 0;
    documentsWithLayout.set(document, value);
  }
  return value;
};

/**
 * Rendered. Tabindex alone cannot see an ancestor's `display: none` or `visibility: hidden`;
 * `checkVisibility` can, and unlike a rect test it is not fooled by a hidden element that still
 * occupies space. Opacity is deliberately not considered — a faded-in list is still navigable.
 */
const isRendered = (element: HTMLElement): boolean => {
  if (!hasLayout(element.ownerDocument)) {
    return true;
  }
  return typeof element.checkVisibility === 'function'
    ? element.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })
    : element.getClientRects().length > 0;
};

/** Reachable by `Tab`. */
export const isTabbable = (element: HTMLElement): boolean =>
  element.tabIndex >= 0 && element.matches(FOCUSABLE_SELECTOR) && isRendered(element);

/** Container of a composite-widget focus group (a groupper, a mover, or both). */
export const isFocusGroup = (element: Element): boolean =>
  element.hasAttribute(FOCUS_GROUP_ATTR) || element.hasAttribute(FOCUS_MOVER_ATTR);

const search = (parent: Element, backward: boolean): HTMLElement | null => {
  const children = Array.from(parent.children) as HTMLElement[];
  if (backward) {
    children.reverse();
  }
  for (const child of children) {
    if (isSentinel(child) || isExcluded(child)) {
      continue;
    }
    if (isTabbable(child)) {
      return child;
    }
    const nested = search(child, backward);
    if (nested) {
      return nested;
    }
  }
  return null;
};

/**
 * First tabbable descendant of `container`, in DOM order. Excludes the container itself.
 * Replaces tabster's `useFocusFinders().findFirstFocusable`.
 */
export const findFirstFocusable = (container: HTMLElement | null | undefined): HTMLElement | null =>
  container ? search(container, false) : null;

/** Last tabbable descendant of `container`, in DOM order. */
export const findLastFocusable = (container: HTMLElement | null | undefined): HTMLElement | null =>
  container ? search(container, true) : null;

/**
 * Top-level arrow-navigation targets within `container`: tabbable elements and nested group
 * containers, without descending into either. A nested group is one stop, which is what makes a
 * row holding its own controls a single arrow step rather than several.
 */
export const getFocusItems = (container: HTMLElement): HTMLElement[] => {
  const items: HTMLElement[] = [];
  const collect = (parent: Element) => {
    for (const child of Array.from(parent.children) as HTMLElement[]) {
      if (isSentinel(child) || isExcluded(child)) {
        continue;
      }
      if (isFocusGroup(child) || isTabbable(child)) {
        items.push(child);
      } else {
        collect(child);
      }
    }
  };
  collect(container);
  return items;
};

/** The mover item focus returns to, when it is still in the DOM. */
export const getCurrentItem = (container: HTMLElement): HTMLElement | null =>
  getFocusItems(container).find((item) => item.hasAttribute(FOCUS_CURRENT_ATTR)) ?? null;

/** True while the group's contents — rather than the container itself — hold focus. */
export const isEntered = (container: HTMLElement): boolean => {
  const active = container.ownerDocument.activeElement;
  return !!active && active !== container && container.contains(active) && !isSentinel(active);
};

/**
 * Where `Tab` should land when entering `container` from outside: the container itself for a
 * limited groupper (that is what limiting means), otherwise the memorized item or the edge.
 */
export const getEntryTarget = (container: HTMLElement, backward = false): HTMLElement | null => {
  const behavior = container.getAttribute(FOCUS_GROUP_ATTR) as FocusGroupTabBehavior | null;
  if ((behavior === 'limited' || behavior === 'limited-trap-focus') && isTabbable(container)) {
    return container;
  }
  if (container.hasAttribute(FOCUS_MOVER_ATTR)) {
    const current = getCurrentItem(container);
    if (current) {
      return isTabbable(current) ? current : getEntryTarget(current, backward);
    }
  }
  return backward ? findLastFocusable(container) : findFirstFocusable(container);
};

/**
 * The tab stop after (or before) `from`'s subtree, honouring group boundaries: a group is entered
 * at its entry target rather than at whichever descendant happens to come first in DOM order.
 *
 * Walking the document is affordable because this runs only when a group hands focus out, not on
 * every `Tab`.
 */
export const findNextTabStop = (from: HTMLElement, backward = false): HTMLElement | null => {
  const doc = from.ownerDocument;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const element = node as HTMLElement;
      if (from.contains(element)) {
        return NodeFilter.FILTER_REJECT;
      }
      // Sentinels are `aria-hidden`, so they must be matched before the exclusion test.
      if (isSentinel(element)) {
        return NodeFilter.FILTER_ACCEPT;
      }
      if (isExcluded(element)) {
        return NodeFilter.FILTER_REJECT;
      }
      return isTabbable(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  walker.currentNode = from;
  let node = backward ? walker.previousNode() : walker.nextNode();
  while (node) {
    const element = node as HTMLElement;
    if (!isSentinel(element)) {
      return element;
    }
    // A group's leading sentinel going forward (or trailing going backward) means we are about to
    // enter it; the opposite sentinel belongs to a group we are stepping over.
    const entering = (element.getAttribute(FOCUS_SENTINEL_ATTR) === 'start') !== backward;
    const container = element.parentElement;
    if (entering && container) {
      const target = getEntryTarget(container, backward);
      if (target) {
        return target;
      }
    }
    node = backward ? walker.previousNode() : walker.nextNode();
  }

  return null;
};

/**
 * The element focus leaves when tabbing out of `container`. A mover is a single tab stop, so
 * tabbing out of a row inside a listbox leaves the listbox rather than landing on the next row.
 * A groupper stops the climb: its own container is the stop focus returns to.
 */
export const getTabExitBoundary = (container: HTMLElement): HTMLElement => {
  let boundary = container;
  for (;;) {
    const mover = boundary.parentElement?.closest<HTMLElement>(`[${FOCUS_MOVER_ATTR}]`);
    if (!mover || mover.hasAttribute(FOCUS_GROUP_ATTR) || mover.hasAttribute(FOCUS_TABBABLE_ATTR)) {
      return boundary;
    }
    boundary = mover;
  }
};
