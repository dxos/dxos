//
// Copyright 2026 DXOS.org
//

//
// The `card` type as a composite object, written in the scene DSL rather than painted by a React view: a frame, a
// glyph, a title, a body, a hairline and a footer, each a part of its own. Every part is selected, moved, restyled
// and edited in place like any other shape, and each says how it follows the frame (`constrain`), so a card resized
// taller grows its body rather than scaling like a picture.
//
// Its text parts `bind` to the card's own fields, so the data stays typed on the shape (`label`, `body`, `footer`,
// `icon`) and the composite says only how that data is laid out. The three regions a card may do without are
// `optional`: an Instance turns one off and the part that names it in `grow` takes the room.
//

/** One minor grid cell, which every size and offset here is a whole number of. */
const CELL = 12;

/** The card at the size it is authored: twenty-four cells wide by sixteen tall. */
export const CARD_SIZE = { width: CELL * 24, height: CELL * 16 };

const PAD = CELL;
const GLYPH = CELL * 3;
const FOOTER = CELL * 1.5;
const TITLE = CELL * 2;
/** The hairline over the footer: a filled sliver, since a part cannot carry a border on one side alone. */
const RULE = 1;

const LEFT = -CARD_SIZE.width / 2 + PAD;
const TOP = -CARD_SIZE.height / 2 + PAD;
const RIGHT = CARD_SIZE.width / 2 - PAD;
const BOTTOM = CARD_SIZE.height / 2 - PAD;
const WIDTH = RIGHT - LEFT;

/** The header is the three cells its glyph sets; the body takes what the header and the footer leave. */
const BODY_TOP = TOP + GLYPH + CELL / 2;
const BODY_BOTTOM = BOTTOM - FOOTER - CELL / 2;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The card's parts, in the order they are drawn. The glyph keeps the top left corner (`min`), the footer and its
 * hairline the floor (`max`), and the title and body stretch across the width, so the card reflows rather than
 * scaling. Turning the glyph off widens the title; turning the footer off grows the body into it and takes the
 * hairline with it (`follows`).
 *
 * The composite is declared as `cardObject`, not `card`: a drawing's object ids and its kinds share a namespace, and
 * `card` is now a kind. The id it is stored under is the tool's either way (`template:card`).
 */
export const CARD_TEMPLATE = `composite cardObject size=${CARD_SIZE.width}x${CARD_SIZE.height} name="Card" {
  element frame rect @ 0,0 size=${CARD_SIZE.width}x${CARD_SIZE.height} constrain=stretch rounded=true
  element icon icon @ ${round(LEFT + GLYPH / 2)},${round(TOP + GLYPH / 2)} size=${GLYPH}x${GLYPH} constrain=min bind=icon optional=true
  element title note @ ${round((LEFT + GLYPH + CELL / 2 + RIGHT) / 2)},${round(TOP + GLYPH / 2)} size=${round(WIDTH - GLYPH - CELL / 2)}x${TITLE} constrain=stretch,min bind=label padding=0,0 grow=icon
  element body note @ 0,${round((BODY_TOP + BODY_BOTTOM) / 2)} size=${WIDTH}x${round(BODY_BOTTOM - BODY_TOP)} constrain=stretch bind=body padding=0,0 optional=true grow="footer rule"
  element rule rect @ 0,${round(BOTTOM - FOOTER - CELL / 4)} size=${WIDTH}x${RULE} constrain=stretch,max surface=solid follows=footer
  element footer note @ 0,${round(BOTTOM - FOOTER / 2)} size=${WIDTH}x${FOOTER} constrain=stretch,max bind=footer padding=0,0 optional=true
}
`;
