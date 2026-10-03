//
// Copyright 2026 DXOS.org
//

/**
 * Describes the scrolled element for the debug overlay, or `undefined` when the event does not come
 * from an element worth reporting.
 *
 * A capture-phase `scroll` listener on `document` also receives the viewport's own scroll events,
 * whose target is the `Document` rather than an `Element`, so it carries no `classList` to read.
 */
export const describeScrollTarget = (target: EventTarget | null): string | undefined => {
  if (!(target instanceof Element)) {
    return undefined;
  }

  // Viewport scrolling is already handled by the window scroll reset, so the scrolling roots have
  // nothing to report.
  const { documentElement, body } = target.ownerDocument;
  if (target === documentElement || target === body) {
    return undefined;
  }

  const classNames = Array.from(target.classList).slice(0, 2).join('.');
  return `${target.tagName}${classNames ? `.${classNames}` : ''} top=${target.scrollTop.toFixed(0)}`;
};
