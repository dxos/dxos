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

import { OptionsLookupAnnotation, iconOptions } from '@dxos/react-ui-form';
import * as Icon from '@dxos/react-ui/Icon';
import { type NodeBase, nodeBase } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type NodeViewProps } from '../../model/index.ts';
import { TextPart } from '../PartEditor/index.ts';

/**
 * The `icon` type's schema: a glyph and an optional caption. Declared here rather than in `@dxos/scene` because it
 * is a type of the 2D editor, not of the scene model — the same place `image` is declared.
 */
export const IconNode = Schema.Struct({
  type: Schema.Literal('icon'),
  ...nodeBase,
  /** A Phosphor name (`rocket`); the picker offers the whole catalogue. */
  icon: Schema.optional(Schema.String.annotate({ title: 'Icon' }).pipe(OptionsLookupAnnotation.set(iconOptions()))),
  /** A caption under the glyph. */
  label: Schema.optional(Schema.String.annotate({ title: 'Label' })),
});
export type IconNode = Schema.Schema.Type<typeof IconNode>;

export const isIconNode = (node: NodeBase): node is IconNode => node.type === 'icon';

/** The icon name of a node that declares one; the full Phosphor set resolves at runtime (`useIconHref`). */
export const iconOf = (node: NodeViewProps['node']): string | undefined =>
  'icon' in node && typeof node.icon === 'string' ? node.icon : undefined;

/** A node's text field, which only a type declaring it has. */
export const textOf = (node: NodeViewProps['node'], field: string): string | undefined => {
  const value = Reflect.get(node, field);
  return typeof value === 'string' ? value : undefined;
};

/** A Phosphor name as the icon component takes it; a name that already names a set is passed through. */
export const iconName = (icon: string): string => (icon.includes('--') ? icon : `ph--${icon}--regular`);

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
  const label = textOf(node, 'label');
  const body = textOf(node, 'body');
  const footer = textOf(node, 'footer');
  return (
    // Sized by its parent rather than `dx-cover`, so a type may put the frame inside its own padded shell.
    <div className={mx('flex flex-col size-full gap-2 p-3 overflow-hidden', classNames)} data-part='card'>
      {(icon || label !== undefined) && (
        <div className='flex items-center gap-2 shrink-0' data-part='card-header'>
          {icon && <Icon.Icon icon={iconName(icon)} size='lg' classNames='shrink-0' />}
          {label !== undefined && (
            <TextPart part='label' text={label} editing={editing} classNames='grow truncate'>
              {label}
            </TextPart>
          )}
        </div>
      )}
      {children}
      {body !== undefined && (
        <TextPart part='body' text={body} editing={editing} classNames='text-sm whitespace-pre-wrap'>
          {body}
        </TextPart>
      )}
      {footer !== undefined && (
        <TextPart
          part='footer'
          text={footer}
          editing={editing}
          classNames='mt-auto shrink-0 pt-2 border-bs border-separator text-xs text-description truncate'
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
 * An icon alone, filling the frame: the glyph a type names in its `icon` field. Any Phosphor name works — the icon
 * registry fetches a symbol it does not have (`providers/ThemeProvider/icon-registry.ts`), so the set is not limited
 * to the ones the UI already draws.
 */
export const IconNodeView = ({ node, editing }: NodeViewProps) => {
  const icon = iconOf(node);
  const label = textOf(node, 'label');
  return (
    <div className='dx-cover flex flex-col items-center justify-center gap-1 overflow-hidden' data-part='icon'>
      {icon && <Icon.Icon icon={iconName(icon)} classNames='w-[70%] h-[70%] min-h-0 min-w-0' />}
      {label !== undefined && label.length > 0 && (
        <TextPart part='label' text={label} editing={editing} classNames='shrink-0 text-xs truncate max-w-full'>
          {label}
        </TextPart>
      )}
    </div>
  );
};
