//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { EID, URI } from '@dxos/keys';

import { AnchorWidget } from './anchor.ts';
import { type LinkWidgetProps, linkWidgets, matchSchemes } from './link-widgets.ts';
import { type WidgetDef } from './widgets.ts';

/** URL schemes that name an ECHO object. */
export const OBJECT_URL_SCHEMES = ['eid:', 'echo:'];

/**
 * The URI a widget may resolve, or `undefined` while the link does not name a whole object yet.
 *
 * A link is claimed by its scheme alone, so a widget is built from every prefix a link passes
 * through — as it is typed, or as a model streams it — and resolving one that names no entity
 * throws from inside render, where no editor-side catch can reach it.
 */
export const parseObjectUri = (eid: string | undefined): URI.URI | undefined => {
  if (!eid) {
    return undefined;
  }
  const parsed = EID.tryParse(eid);
  // A space-only `echo://<spaceId>` parses but names no entity, and resolving that throws too.
  return parsed && EID.getEntityId(parsed) ? URI.make(eid) : undefined;
};

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
