//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { type Space } from '@dxos/client/echo';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';

import { meta } from '#meta';

export type PreviewLinkContext = {
  /** The space the activating document belongs to, when one is known. */
  space?: Space;
};

/** Decides, synchronously, whether a URL is one this resolver answers — so a renderer can make it an anchor before anyone hovers. */
export type PreviewLinkMatch = (url: string) => boolean;

/** Answers an anchor activation with the object its link names, or undefined. */
export type PreviewLinkResolve = (
  ref: PreviewLinkRef,
  context: PreviewLinkContext,
) => Effect.Effect<PreviewLinkTarget | undefined>;

/**
 * One kind of link — an ECHO entity URI, a GitHub URL — with the test that recognises it and the
 * lookup that answers it. A resolver owns its kind and declines the rest, so the order resolvers
 * are asked in does not matter.
 */
export type PreviewLinkResolver = {
  match: PreviewLinkMatch;
  resolve: PreviewLinkResolve;
  /**
   * A short name for a URL written bare — `#123` for a pull request — so a renderer can show it
   * instead of the whole address without knowing the URL's shape.
   */
  label?: (url: string) => string | undefined;
};

/**
 * Multi capability: each contributing plugin provides one batch of resolvers. The popover asks
 * every resolver and shows the first answer, so a plugin that can turn a URL into an object needs
 * only this and a `CardContent` surface for the object's type.
 */
export const LinkResolver = Capability.make<PreviewLinkResolver[]>()(`${meta.profile.key}.capability.linkResolver`);

/** Whether any contributed resolver answers for the URL: what a renderer asks before making a link an anchor. */
export const isPreviewLink = (resolvers: readonly PreviewLinkResolver[], url: string): boolean =>
  resolvers.some(({ match }) => match(url));

/** The first short name a resolver offers for the URL, or undefined when none does. */
export const linkLabel = (resolvers: readonly PreviewLinkResolver[], url: string): string | undefined => {
  for (const { match, label } of resolvers) {
    const name = match(url) ? label?.(url) : undefined;
    if (name) {
      return name;
    }
  }
  return undefined;
};
