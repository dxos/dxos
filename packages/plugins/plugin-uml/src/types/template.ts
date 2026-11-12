//
// Copyright 2026 DXOS.org
//

//
// The UML class as a composite object, written in the scene DSL rather than painted by a React view. Its three
// compartments are text parts bound to the class's own fields, so the data stays typed on the shape (`label`,
// `attributes`, `methods`) while the composite says how the shape is laid out — and each compartment is edited in
// place, selected, moved, restyled or resized like any other part.
//

/** One minor grid cell, which every size and offset here is a whole number of. */
const CELL = 12;

/** The class at the size it is authored: sixteen cells wide by twelve tall. */
export const SIZE = { width: CELL * 16, height: CELL * 12 };

/** A compartment that holds one line; the attributes take what the other two leave. */
const ROW = CELL * 3;
const MIDDLE = SIZE.height - ROW * 2;
const TOP = -SIZE.height / 2;

/**
 * The compartments tile the frame exactly and each draws its own border, so their shared edges read as the two rules
 * a class is drawn with and there is no separate shape to keep in step with them. The name keeps the top and the
 * methods the bottom, so a class resized taller grows its attribute list rather than stretching its name.
 */
export const TEMPLATE = `composite class size=${SIZE.width}x${SIZE.height} name="Class" {
  element name note @ 0,${TOP + ROW / 2} size=${SIZE.width}x${ROW} constrain=stretch,min bind=label border=true
  element attributes note @ 0,0 size=${SIZE.width}x${MIDDLE} constrain=stretch bind=attributes border=true
  element methods note @ 0,${-TOP - ROW / 2} size=${SIZE.width}x${ROW} constrain=stretch,max bind=methods border=true
}
`;
