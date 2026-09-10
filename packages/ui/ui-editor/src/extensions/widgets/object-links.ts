//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { createElement } from 'react';

import { AnchorWidget } from './anchor';
import { type LinkWidgetProps, linkWidgets, matchSchemes } from './link-widgets';
import { type WidgetDef } from './widgets';

/** URL schemes that name an ECHO object. */
export const OBJECT_URL_SCHEMES = ['dxn:', 'echo:'];

/** A link widget's props, with the URL under the name the object machinery uses. */
export type ObjectLinkProps<TContext = any> = LinkWidgetProps<TContext> & { dxn: string };

export type ObjectLinksOptions = {
  /** URL scheme prefixes that make a link an object link. */
  schemes?: string[];
  /** Overrides the default chip's preview trigger. */
  trigger?: 'hover' | 'click';
  /** The inline widget for `[label](dxn:…)`; the anchor chip by default. */
  link?: WidgetDef<ObjectLinkProps>;
  /** The block widget for `![label](dxn:…)`; none by default. */
  image?: WidgetDef<ObjectLinkProps>;
};

/** The definition over link props, with `dxn` set from the URL for the object-side code it calls. */
const withDxn = (def: WidgetDef<ObjectLinkProps>): WidgetDef<LinkWidgetProps> => {
  const { factory, Component, estimatedHeight, ...rest } = def;
  const objectProps = (props: LinkWidgetProps): ObjectLinkProps => ({ ...props, dxn: props.url });
  return {
    ...rest,
    ...(factory && { factory: (props) => factory(objectProps(props)) }),
    ...(Component && { Component: (props) => createElement(Component, objectProps(props)) }),
    ...(estimatedHeight && { estimatedHeight: (props) => estimatedHeight(objectProps(props)) }),
  };
};

/**
 * Object links as widgets: an inline chip for `[label](dxn:…)` (which carries the preview popover)
 * and, when the host provides one, a block for `![label](dxn:…)`.
 */
export const objectLinks = ({
  schemes = OBJECT_URL_SCHEMES,
  trigger,
  link = {
    factory: ({ label, dxn }) => new AnchorWidget(label, dxn, trigger),
  },
  image,
}: ObjectLinksOptions = {}): Extension =>
  linkWidgets({
    match: matchSchemes(schemes),
    link: withDxn(link),
    image: image && withDxn(image),
  });
