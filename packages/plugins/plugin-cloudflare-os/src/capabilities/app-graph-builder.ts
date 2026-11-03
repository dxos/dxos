//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';

import { CloudflareOs } from '#types';

/**
 * The bound workspace in the space's content group. The section has no "+": a workspace is bound from the
 * connection's sync targets, so the section is absent until one is.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* TypeSection.createTypeSectionExtension(CloudflareOs.Workspace, {
      urlKey: 'cloudflare-os',
      match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.content),
      groupSegment: GraphPath.GroupSegments.content,
    });
    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
