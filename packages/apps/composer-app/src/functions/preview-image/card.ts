//
// Copyright 2026 DXOS.org
//

import { type Swatch, swatch } from './hues.ts';

export const WIDTH = 1200;
export const HEIGHT = 630;

/** A published space, drawn like a repository card: its name, what it holds, and a bar of its types. */
export type SpaceCard = {
  kind: 'space';
  name?: string;
  description?: string;
  /** Phosphor icon id (`ph--planet--regular`). */
  icon?: string;
  hue?: string;
  /** Most numerous first. */
  types: readonly { label: string; icon?: string; hue?: string; count: number }[];
};

/** One object of a published space. */
export type ObjectCard = {
  kind: 'object';
  title: string;
  /** The object's type, singular (`Document`). */
  type?: string;
  description?: string;
  icon?: string;
  hue?: string;
  space: { name?: string; icon?: string; hue?: string };
};

export type Card = SpaceCard | ObjectCard;

/** Icon markup by `iconKey`, already coloured; a missing icon is left out of the drawing. */
export type Icons = ReadonlyMap<string, string>;

export const iconKey = (id: string, color: string): string => `${id} ${color}`;

/** Satori's element shape, which is React's without needing React. */
export type Node = { type: string; key: null; props: { style?: Style; src?: string; children?: Child | Child[] } };
type Child = Node | string;
type Style = Record<string, string | number>;

/** Types the space card names; the rest are summed into a last "more" entry. */
const MAX_STATS = 3;

const INK = '#171717';
const MUTED = '#737373';
const BODY = '#525252';
const BRAND = 'Published from Composer';
const UNTITLED = 'Untitled space';

/** The icons a card draws, each with the colour it is drawn in, so they can be fetched before layout. */
export const iconsOf = (card: Card): { id: string; color: string }[] => {
  const icons =
    card.kind === 'space'
      ? [
          { id: card.icon, color: swatch(card.hue).ink },
          ...card.types.slice(0, MAX_STATS).map((type) => ({ id: type.icon, color: BODY })),
        ]
      : [
          { id: card.icon, color: swatch(card.hue).ink },
          { id: card.space.icon, color: swatch(card.space.hue).ink },
        ];
  return icons.flatMap(({ id, color }) => (id ? [{ id, color }] : []));
};

export const layout = (card: Card, icons: Icons): Node =>
  card.kind === 'space' ? spaceLayout(card, icons) : objectLayout(card, icons);

const spaceLayout = (card: SpaceCard, icons: Icons): Node => {
  const name = card.name?.trim() || UNTITLED;
  const shown = card.types.slice(0, MAX_STATS);
  const rest = card.types.slice(MAX_STATS).reduce((sum, type) => sum + type.count, 0);
  return frame(
    [
      div({ display: 'flex', flex: 1, padding: '72px 72px 0' }, [
        div({ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 48 }, [
          text(BRAND, { fontSize: 26, color: MUTED }),
          text(name, { fontSize: 68, fontWeight: 600, lineHeight: 1.1, marginTop: 16, lineClamp: 2 }),
          ...(card.description
            ? [text(card.description, { fontSize: 30, color: BODY, lineHeight: 1.35, marginTop: 20, lineClamp: 2 })]
            : []),
        ]),
        tile(name, card.icon, swatch(card.hue), 176, icons),
      ]),
      div({ display: 'flex', gap: 40, padding: '0 72px 44px' }, [
        ...shown.map((type) =>
          div({ display: 'flex', alignItems: 'center', gap: 12 }, [
            ...icon(type.icon, 32, BODY, icons),
            text(`${type.count} ${type.label}`, { fontSize: 28, color: BODY }),
          ]),
        ),
        ...(rest > 0 ? [text(`${rest} more`, { fontSize: 28, color: MUTED })] : []),
      ]),
    ],
    card.types.length > 0 ? typeBands(card.types) : [{ weight: 1, color: swatch(card.hue).fill }],
  );
};

const objectLayout = (card: ObjectCard, icons: Icons): Node => {
  const space = card.space.name?.trim() || UNTITLED;
  const hue = swatch(card.hue);
  return frame(
    [
      div({ display: 'flex', flexDirection: 'column', flex: 1, padding: '72px 72px 0' }, [
        div({ display: 'flex', alignItems: 'center', gap: 14, minHeight: 34 }, [
          ...icon(card.icon, 34, hue.ink, icons),
          ...(card.type ? [text(card.type, { fontSize: 28, color: MUTED, lineClamp: 1 })] : []),
        ]),
        text(card.title, { fontSize: 64, fontWeight: 600, lineHeight: 1.1, marginTop: 24, lineClamp: 2 }),
        ...(card.description
          ? [text(card.description, { fontSize: 30, color: BODY, lineHeight: 1.35, marginTop: 20, lineClamp: 3 })]
          : []),
      ]),
      // The space this object belongs to, named beside its own icon.
      div({ display: 'flex', alignItems: 'center', gap: 18, padding: '0 72px 44px' }, [
        tile(space, card.space.icon, swatch(card.space.hue), 64, icons),
        div({ display: 'flex', flexDirection: 'column', gap: 2 }, [
          text(space, { fontSize: 28, fontWeight: 600, lineClamp: 1 }),
          text(BRAND, { fontSize: 22, color: MUTED }),
        ]),
      ]),
    ],
    [{ weight: 1, color: hue.fill }],
  );
};

type Band = { weight: number; color: string };

/** One band per colour, largest first, so types that share a hue read as one block. */
export const typeBands = (types: SpaceCard['types']): Band[] => {
  const bands = new Map<string, number>();
  types.forEach((type, index) => {
    const color = swatch(type.hue, index).fill;
    bands.set(color, (bands.get(color) ?? 0) + type.count);
  });
  return [...bands].map(([color, weight]) => ({ weight, color })).sort((a, b) => b.weight - a.weight);
};

/** The white page every card sits on, with its coloured bar along the bottom edge. */
const frame = (children: Node[], bar: Band[]): Node =>
  div(
    {
      display: 'flex',
      flexDirection: 'column',
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: '#ffffff',
      color: INK,
      fontFamily: 'Inter',
    },
    [
      ...children,
      div(
        { display: 'flex', height: 16 },
        bar.map(({ weight, color }) => div({ flexGrow: weight, flexBasis: 0, backgroundColor: color })),
      ),
    ],
  );

/** The space's icon on its tint, or its initial when it has none. */
const tile = (name: string, iconId: string | undefined, hue: Swatch, size: number, icons: Icons): Node => {
  const mark = icon(iconId, Math.round(size * 0.58), hue.ink, icons);
  return div(
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.22),
      backgroundColor: hue.tint,
    },
    mark.length > 0
      ? mark
      : [
          text([...name][0]?.toUpperCase() ?? '?', {
            fontSize: Math.round(size * 0.5),
            fontWeight: 600,
            color: hue.ink,
          }),
        ],
  );
};

const icon = (id: string | undefined, size: number, color: string, icons: Icons): Node[] => {
  const svg = id && icons.get(iconKey(id, color));
  return svg ? [{ type: 'img', key: null, props: { src: svgDataUri(svg), style: { width: size, height: size } } }] : [];
};

const svgDataUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** A box; Satori lays out a `div` with child nodes only as flex, so that is the default. */
const div = (style: Style, children: Child[] = []): Node => ({
  type: 'div',
  key: null,
  props: { style: { display: 'flex', ...style }, children },
});

/** A text block; `lineClamp` needs `display: block`, where Satori ends the last line with an ellipsis. */
const text = (value: string, style: Style): Node => ({
  type: 'div',
  key: null,
  props: { style: { display: 'block', ...style }, children: value },
});
