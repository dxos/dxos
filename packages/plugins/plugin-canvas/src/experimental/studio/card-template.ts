//
// Copyright 2026 DXOS.org
//

//
// The studio card as a COMPOSITE rather than a React view: one definition, placed many times, each placement
// overriding only what differs. `Card.tsx` paints every card itself, so every variant of it is another branch in a
// component; here the shape is data — a layout of parts, each bound to a field of the node that places it — and a
// variant is a placement with different values.
//
// The three pieces the DSL gives, which is the whole answer to "one definition used in many places with overrides":
//
//   1. `composite <id> size=WxH name="…" { element … }` declares it once.
//   2. `bind=<field>` on an element is the override point: the part draws the placing node's field of that name.
//      A kind's own field is `data.<field>`, QUOTED: a bare DSL name cannot contain a dot, so an unquoted
//      `bind=data.icon` does not lex, and it takes the whole template — and the kind registration — down with it.
//   3. `object <id> <kind> [size=WxH] [name=value]*` places it; the node carries `composite`, the bound fields, and
//      an `overrides` style struct that wins over its named style.
//
// What keeps one definition usable at many sizes is the reflow vocabulary, not the geometry: `constrain` says which
// edges a part follows, `optional` drops a part whose field is empty, `grow` says who takes the space it leaves,
// and `follows` ties a part to another's fate. The studio's simple card is this same composite at 304x64 with no
// body and no footer — the title grows into them.
//

/** The studio deck's pitch: its cards are laid out in eights, as `STUDIO_GRID` is. */
const CELL = 8;

/** The deck's full card, in scene units. A placement may be any size; the parts reflow to it. */
export const STUDIO_CARD_SIZE = { width: CELL * 38, height: CELL * 22 };

const PAD = CELL * 2;
const GAP = CELL;
const GLYPH = CELL * 3;
const TITLE = CELL * 3;
const FOOTER = CELL * 2;
const RULE = 1;

const FONT = { icon: GLYPH, title: 23, body: 17, footer: 15 };

const LEFT = -STUDIO_CARD_SIZE.width / 2 + PAD;
const TOP = -STUDIO_CARD_SIZE.height / 2 + PAD;
const RIGHT = STUDIO_CARD_SIZE.width / 2 - PAD;
const BOTTOM = STUDIO_CARD_SIZE.height / 2 - PAD;
const WIDTH = RIGHT - LEFT;

const BODY_TOP = TOP + GLYPH + GAP;
const BODY_BOTTOM = BOTTOM - FOOTER - GAP;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The parts in draw order. The glyph holds the top left (`min`), the footer and its hairline the floor (`max`), and
 * the title and body stretch across the width — so a card reflows rather than scaling, and the deck's 304x64 simple
 * card is this definition with its two optional parts empty.
 *
 * Declared as `studioCardObject`: a drawing's object ids share a namespace with its kinds, and `studio-card` is the
 * kind. The composite is stored under the tool's own id either way (`template:studio-card`).
 */
export const STUDIO_CARD_TEMPLATE = `composite studioCardObject size=${STUDIO_CARD_SIZE.width}x${STUDIO_CARD_SIZE.height} name="Studio card" {
  element frame rect @ 0,0 size=${STUDIO_CARD_SIZE.width}x${STUDIO_CARD_SIZE.height} constrain=stretch rounded=true
  element icon icon @ ${round(LEFT + GLYPH / 2)},${round(TOP + GLYPH / 2)} size=${GLYPH}x${GLYPH} fontSize=${FONT.icon} constrain=min bind="data.icon" optional=true
  element title note "" @ ${round((LEFT + GLYPH + GAP + RIGHT) / 2)},${round(TOP + GLYPH / 2)} size=${round(WIDTH - GLYPH - GAP)}x${TITLE} fontSize=${FONT.title} alignVertical=middle constrain=stretch,min bind=label padding=0,0 grow=icon
  element body note "" @ 0,${round((BODY_TOP + BODY_BOTTOM) / 2)} size=${WIDTH}x${round(BODY_BOTTOM - BODY_TOP)} fontSize=${FONT.body} constrain=stretch bind="data.body" padding=0,0 optional=true grow="footer rule"
  element rule polyline @ 0,${round(BOTTOM - FOOTER - GAP / 2)} size=${WIDTH}x${RULE} constrain=stretch,max points="0,0.5 1,0.5" follows=footer
  element footer note "" @ 0,${round(BOTTOM - FOOTER / 2)} size=${WIDTH}x${FOOTER} fontSize=${FONT.footer} constrain=stretch,max bind="data.footer" padding=0,0 optional=true
}
`;
