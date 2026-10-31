//
// Copyright 2026 DXOS.org
//

/** What the Properties section shows: the selection's form, a placeholder, or nothing. */
export type PropertiesShown = 'form' | 'empty' | 'hidden';

/**
 * Docked, the section keeps its place with nothing selected so the panes do not shift; floating, it goes with nothing
 * to edit.
 */
export const propertiesShown = ({ docked, selected }: { docked: boolean; selected: boolean }): PropertiesShown =>
  selected ? 'form' : docked ? 'empty' : 'hidden';
