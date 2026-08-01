//
// Copyright 2026 DXOS.org
//

/**
 * The planks the deck actually lays out: `flatten` collapses the stack to the current (last) plank,
 * surfacing the rest as breadcrumbs. The companion anchors within this set, never within `deck.active`
 * — anchoring it to a plank that is not rendered would place it outside every tile (and serialize a URL
 * that restores that way).
 */
export const getRenderedPlanks = (active: readonly string[], flatten: boolean | undefined): string[] => {
  if (!flatten) {
    return [...active];
  }

  const current = active[active.length - 1];
  return current ? [current] : [];
};

/**
 * The open plank attention currently points into, or undefined when it points nowhere in the deck.
 * Attention can rest on something nested inside a plank (a child attendable, or the companion pane
 * itself, which shares its context plank's `attendableId`), so ids are matched by path prefix.
 *
 * The *longest* match wins, because planks nest: a mailbox opens its messages as `<mailbox>/<message>`
 * planks, so the mailbox's own id prefixes them. Taking the first match in deck order would hand
 * attention on a message back to the mailbox it came from.
 */
export const findAttendedPlank = (planks: readonly string[], attended: readonly string[]): string | undefined => {
  for (const attendedId of attended) {
    const matches = planks.filter((id) => attendedId === id || attendedId.startsWith(`${id}/`));
    if (matches.length > 0) {
      return matches.reduce((longest, id) => (id.length > longest.length ? id : longest));
    }
  }

  return undefined;
};

/**
 * The plank the deck companion attaches to: the attended plank, so the companion always sits beside the
 * plank the user is working in rather than at the end of the deck. Falls back to the last plank, which is
 * where a freshly restored deck puts attention anyway.
 */
export const resolveCompanionAnchor = (planks: readonly string[], attended: readonly string[]): string | undefined =>
  findAttendedPlank(planks, attended) ?? planks[planks.length - 1];
