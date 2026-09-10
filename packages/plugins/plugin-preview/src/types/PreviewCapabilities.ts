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

/**
 * Answers an anchor activation with the object its link names, or undefined when the link is not
 * this resolver's. A resolver owns one kind of link — an ECHO entity URI, a GitHub URL — and
 * declines the rest, so the order resolvers are asked in does not matter.
 */
export type PreviewLinkResolver = (
  ref: PreviewLinkRef,
  context: PreviewLinkContext,
) => Effect.Effect<PreviewLinkTarget | undefined>;

/**
 * Multi capability: each contributing plugin provides one batch of resolvers. The popover asks
 * every resolver and shows the first answer, so a plugin that can turn a URL into an object needs
 * only this and a `CardContent` surface for the object's type.
 */
export const LinkResolver = Capability.make<PreviewLinkResolver[]>()(`${meta.profile.key}.capability.linkResolver`);
