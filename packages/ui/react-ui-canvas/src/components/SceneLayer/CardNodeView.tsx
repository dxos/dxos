//
// Copyright 2026 DXOS.org
//

//
// The card and icon prototypes: the shapes a type is built on when it is "an icon and a title", or "a header, a body
// and a footer". Neither is a node type of its own — a prototype is never in the registry, the palette or the scene
// schema (`registry.ts`) — so a type declares its own fields and inherits the look and the editing from here.
//
// A type whose content goes beyond the three regions (a feed strip between the header and the body, UML's attribute
// and method compartments) composes {@link CardFrame} in its own view rather than taking the prototype's, and still
// inherits its parts, sizing and ports.
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, type ReactNode } from 'react';

import {
  DEFAULT_LAYOUT_NAME,
  FormLayoutAnnotation,
  OptionsLookupAnnotation,
  iconOptions,
  pairLayout,
} from '@dxos/react-ui-form';
import * as Icon from '@dxos/react-ui/Icon';
import { type NodeBase, STYLE_HUES, nodeBase } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type NodeViewProps } from '../../model/index.ts';
import { TextPart } from '../PartEditor/index.ts';
import { LINE_ON_GRID, PAD_TO_GRID, PARAGRAPH_ON_GRID } from './text.ts';

/** Every region of a card is half a cell from the next. Spelled out: Tailwind emits only what it can read verbatim. */
const GAP_ON_GRID = 'gap-[calc(var(--dx-minor-grid)/2)]';

/**
 * The header's glyph: three minor cells, so the row it sets is three cells tall. A type whose own type scale is not
 * the canvas's (the studio deck's cards) sets `--dx-card-glyph` to the size its header was drawn at.
 */
const HEADER_GLYPH =
  'w-[var(--dx-card-glyph,calc(var(--dx-minor-grid)*3))] h-[var(--dx-card-glyph,calc(var(--dx-minor-grid)*3))]';

/** Phosphor's six weights; the extended `px` set is drawn at `regular` only. */
export const ICON_WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const;

export type IconWeight = (typeof ICON_WEIGHTS)[number];

/**
 * A glyph: which one and at what weight. A struct of its own so the two sit side by side in the Properties panel —
 * a form layout names the fields it draws, so a pair belongs in a pair (as `LinkEnds` does for a link's markers).
 */
export const IconSpec = Schema.Struct({
  /** Which glyph: a Phosphor name (`rocket`), from a picker over the whole catalogue. Not `name`, which under the
   * group's own "Icon" heading would read as "Icon / Icon". */
  type: Schema.optional(Schema.String.annotate({ title: 'Type' }).pipe(OptionsLookupAnnotation.set(iconOptions()))),
  weight: Schema.optional(Schema.Literals(ICON_WEIGHTS).annotate({ title: 'Weight' })),
}).pipe(FormLayoutAnnotation.set({ [DEFAULT_LAYOUT_NAME]: pairLayout('type', 'weight') }));
export type IconSpec = Schema.Schema.Type<typeof IconSpec>;

/**
 * The `card` type's schema: the three regions the prototype draws, and the glyph in its header. Declared here
 * rather than in `@dxos/scene` because it is a type of the 2D editor, not of the scene model — the same place
 * `image` is declared.
 */
export const CardNode = Schema.Struct({
  type: Schema.Literal('card'),
  ...nodeBase,
  icon: Schema.optional(IconSpec),
  label: Schema.optional(Schema.String.annotate({ title: 'Title' })),
  body: Schema.optional(Schema.String.annotate({ title: 'Body' })),
  footer: Schema.optional(Schema.String.annotate({ title: 'Footer' })),
});
export type CardNode = Schema.Schema.Type<typeof CardNode>;

export const isCardNode = (node: NodeBase): node is CardNode => node.type === 'card';

/**
 * The `icon` type's schema: a glyph and an optional caption. Declared here rather than in `@dxos/scene` because it
 * is a type of the 2D editor, not of the scene model — the same place `image` is declared.
 */
export const IconNode = Schema.Struct({
  type: Schema.Literal('icon'),
  ...nodeBase,
  icon: Schema.optional(IconSpec),
  /** A caption under the glyph. */
  label: Schema.optional(Schema.String.annotate({ title: 'Label' })),
});
export type IconNode = Schema.Schema.Type<typeof IconNode>;

export const isIconNode = (node: NodeBase): node is IconNode => node.type === 'icon';

/** The hue a node's style names, which an icon draws its glyph in (`STYLE_HUES` are theme hues). */
const hueOf = (node: NodeViewProps['node']): Icon.IconHue | undefined => {
  const hue = node.style?.hue;
  return STYLE_HUES.find((value) => value === hue);
};

/** A string field of a value, when it has one. */
const stringAt = (value: unknown, field: string): string | undefined => {
  const found = typeof value === 'object' && value !== null ? Reflect.get(value, field) : undefined;
  return typeof found === 'string' ? found : undefined;
};

/** The glyph a node declares, if it declares one; a bare string is the older spelling and still reads. */
export const iconOf = (node: NodeViewProps['node']): IconSpec | undefined => {
  const icon: unknown = Reflect.get(node, 'icon');
  if (typeof icon === 'string') {
    return { type: icon };
  }
  const type = stringAt(icon, 'type');
  if (type === undefined) {
    return undefined;
  }
  const weight = ICON_WEIGHTS.find((value) => value === stringAt(icon, 'weight'));
  return { type, ...(weight ? { weight } : {}) };
};

/** A node's text field, which only a type declaring it has. */
export const textOf = (node: NodeViewProps['node'], field: string): string | undefined => {
  const value = Reflect.get(node, field);
  return typeof value === 'string' ? value : undefined;
};

/** The symbol the icon component takes; a name that already names a set and weight is passed through. */
export const iconSymbol = ({ type, weight }: IconSpec): string | undefined =>
  type === undefined ? undefined : type.includes('--') ? type : `ph--${type}--${weight ?? 'regular'}`;

export type CardFrameProps = PropsWithChildren<{
  node: NodeViewProps['node'];
  editing?: NodeViewProps['editing'];
  /** Drawn between the header and the body: the feed strip of a feed card, a compartment, a chart. */
  children?: ReactNode;
  classNames?: string;
}>;

/**
 * A card: a header of an icon and a title, anything the type puts between, a body, and a footer under a hairline.
 * Every region is a part, so each is edited in place; a region whose field the node does not carry is not drawn, so
 * the same frame serves a title-only card and a full one.
 */
export const CardFrame = ({ node, editing, children, classNames }: CardFrameProps) => {
  const icon = iconOf(node);
  const symbol = icon && iconSymbol(icon);
  const label = textOf(node, 'label');
  const body = textOf(node, 'body');
  const footer = textOf(node, 'footer');
  return (
    // Sized by its parent rather than `dx-cover`, so a type may put the frame inside its own padded shell.
    <div
      className={mx('flex flex-col size-full overflow-hidden', GAP_ON_GRID, PAD_TO_GRID, classNames)}
      data-part='card'
    >
      {(symbol || label !== undefined) && (
        // The glyph is three cells and sets the row's height: a card is read by its icon before its title.
        <div className={mx('flex items-center shrink-0', GAP_ON_GRID)} data-part='card-header'>
          {symbol && <Icon.Icon icon={symbol} hue={hueOf(node)} classNames={mx('shrink-0', HEADER_GLYPH)} />}
          {label !== undefined && (
            <TextPart part='label' text={label} editing={editing} classNames={mx('grow truncate', LINE_ON_GRID)}>
              {label}
            </TextPart>
          )}
        </div>
      )}
      {children}
      {body !== undefined && (
        // The body takes what the header and the footer leave, its text at the top of it.
        <TextPart
          part='body'
          text={body}
          editing={editing}
          classNames={mx('grow overflow-hidden text-sm whitespace-pre-wrap', PARAGRAPH_ON_GRID)}
        >
          {body}
        </TextPart>
      )}
      {footer !== undefined && (
        // Half a cell above the text, less the hairline's own pixel, so the whole block is two cells tall.
        <TextPart
          part='footer'
          text={footer}
          editing={editing}
          classNames={mx(
            'mt-auto shrink-0 pt-[calc(var(--dx-minor-grid)/2-1px)] border-bs border-separator text-xs text-description truncate',
            LINE_ON_GRID,
          )}
        >
          {footer}
        </TextPart>
      )}
    </div>
  );
};

/** The card prototype's own view, for a type that adds no region of its own. */
export const CardNodeView = ({ node, editing }: NodeViewProps) => (
  <CardFrame node={node} editing={editing} classNames='dx-cover' />
);

/**
 * An icon alone, filling the frame, or at its style's `fontSize` where it sets one (a card's glyph is the size of its
 * two cells): the glyph a type names in its `icon` field. Any Phosphor name works — the icon
 * registry fetches a symbol it does not have (`providers/ThemeProvider/icon-registry.ts`), so the set is not limited
 * to the ones the UI already draws.
 */
export const IconNodeView = ({ node, editing }: NodeViewProps) => {
  const icon = iconOf(node);
  const symbol = icon && iconSymbol(icon);
  const label = textOf(node, 'label');
  const size = node.style?.fontSize;
  return (
    <div className='dx-cover flex flex-col items-center justify-center gap-1 overflow-hidden' data-part='icon'>
      {symbol && (
        <Icon.Icon
          icon={symbol}
          hue={hueOf(node)}
          classNames={mx('min-w-0', size === undefined && 'w-[70%] h-[70%]')}
          style={size === undefined ? undefined : { width: size, height: size }}
        />
      )}
      {label !== undefined && label.length > 0 && (
        <TextPart part='label' text={label} editing={editing} classNames='shrink-0 text-xs truncate max-w-full'>
          {label}
        </TextPart>
      )}
    </div>
  );
};
