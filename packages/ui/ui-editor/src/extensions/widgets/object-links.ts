//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { AnchorWidget } from './anchor';
import { type LinkWidgetProps, linkWidgets, matchSchemes } from './link-widgets';
import { type WidgetDef } from './widgets';

/** URL schemes that name an ECHO object. */
export const OBJECT_URL_SCHEMES = ['eid:', 'echo:'];

/** A link widget's props, with the URL under the name the object machinery uses. */
export type ObjectLinkProps<TContext = any> = LinkWidgetProps<TContext> & { eid: string };

export type ObjectLinksOptions = {
  /** URL scheme prefixes that make a link an object link. */
  schemes?: string[];
  /** Overrides the default chip's preview trigger. */
  trigger?: 'hover' | 'click';
  /** The inline widget for `[label](eid:…)`; the anchor chip by default. */
  link?: WidgetDef<ObjectLinkProps>;
  /** The block widget for `![label](eid:…)`; none by default. */
  image?: WidgetDef<ObjectLinkProps>;
};

/**
 * Object links as widgets: an inline chip for `[label](eid:…)` (which carries the preview popover)
 * and, when the host provides one, a block for `![label](eid:…)`.
 */
export const objectLinks = ({
  schemes = OBJECT_URL_SCHEMES,
  trigger,
  link = {
    factory: ({ label, eid }) => new AnchorWidget(label, eid, trigger),
  },
  image,
}: ObjectLinksOptions = {}): Extension =>
  linkWidgets<ObjectLinkProps>({
    match: matchSchemes(schemes),
    link,
    image,
    // The URL under the name the object-side code reads.
    props: (props) => ({ ...props, eid: props.url }),
  });
