//
// Copyright 2026 DXOS.org
//

/**
 * The open plank attention currently points into, or undefined when it points nowhere in the deck.
 * Attention can rest on something nested inside a plank (a child attendable, or the companion pane
 * itself, which shares its context plank's `attendableId`), so ids are matched by path prefix.
 */
export const findAttendedPlank = (planks: readonly string[], attended: readonly string[]): string | undefined => {
  for (const attendedId of attended) {
    const plank = planks.find((id) => attendedId === id || attendedId.startsWith(`${id}/`));
    if (plank) {
      return plank;
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
