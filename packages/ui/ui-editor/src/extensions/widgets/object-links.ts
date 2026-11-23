//
// Copyright 2026 DXOS.org
//

import { type Extension, Facet } from '@codemirror/state';

import { AnchorWidget } from './anchor.ts';
import { type LinkWidgetProps, linkWidgets, matchSchemes } from './link-widgets.ts';
import { type WidgetDef } from './widgets.ts';

/** URL schemes that name an ECHO object. */
export const OBJECT_URL_SCHEMES = ['eid:', 'echo:'];

/** The element inside an object's embed that takes the cursor once attended, for an object an extension just made; asked once. */
export const objectEmbedFocus = Facet.define<
  (objectId: string) => string | undefined,
  (objectId: string) => string | undefined
>({
  // The first claim wins, and later ones are not asked, as asking can consume a claim.
  combine: (claims) => (objectId) =>
    claims.reduce<string | undefined>((found, claim) => found ?? claim(objectId), undefined),
});

/** A link widget's props, with the URL under the name the object machinery uses. */
export type ObjectLinkProps<TContext = unknown> = LinkWidgetProps<TContext> & { eid: string };

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
