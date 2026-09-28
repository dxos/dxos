//
// Copyright 2024 DXOS.org
//

/**
 * Indent the drop hitbox reasons in, which is deliberately wider than the visual one.
 *
 * The `reparent` zones under a last child are carved out of the row's bottom band by indent, so at
 * the visual 24px-or-less block they are narrow strips — the instruction is produced (measurable) but no one can
 * hit it, which reads as "there is no way to drop past the last child". The indicator keeps using
 * the visual indent so its line still lands under the row it refers to.
 */
export const DROP_INDENTATION = 24;

/**
 * The tree's block: the width of the toggle column, of the icon cell and of one level's indent, so a
 * child's toggle is centred under its parent's icon. Set on the tree element from `compact`.
 */
export const TREE_BLOCK = 'var(--dx-tree-block)';

/** A compact tree's block: the icon plus the `px-0.5` a compact `IconButton` keeps (1.25rem + 0.25rem). */
export const COMPACT_TREE_BLOCK = '1.5rem';

export const indentTrack = (level: number): string => `calc(${level - 1} * ${TREE_BLOCK})`;
