//
// Copyright 2026 DXOS.org
//

//
// How text sits on the canvas's grid. A line is a whole number of half minor cells tall, so every pair of lines
// lands on the grid and a shape built from text parts (a card's regions, a composite's text nodes) lines up with
// one drawn by a type's own view. Half a cell rather than a whole one: a whole one leaves a line of body text
// looking adrift in its own box.
//
// Important: a size class (`text-lg`) carries its own leading, which would otherwise win, hence the `!`.
//

/** A single line — a label, a title, a caption — at the tightest leading that still clears its descenders. */
export const LINE_ON_GRID = '[--dx-line:round(up,1.2em,calc(var(--dx-minor-grid)/2))] leading-(--dx-line)!';

/** A paragraph: looser than a label, on the same half cells. */
export const PARAGRAPH_ON_GRID = '[--dx-line:round(up,1.5em,calc(var(--dx-minor-grid)/2))] leading-(--dx-line)!';

/**
 * A shape pads its contents to the minor cell measured from its own edge, giving back the frame's border, so what it
 * draws sits on the grid the shape was dropped on rather than a border width inside it.
 */
export const PAD_TO_GRID = 'p-[calc(var(--dx-minor-grid)-var(--scene-frame-border,0px))]';
