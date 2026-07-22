//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, Paths, TypeSection } from '@dxos/app-toolkit';
import { Topic } from '@dxos/compute';

/**
 * Resolves `root/<spaceId>/<ai-group>/<topic-typename>/<objectId>` paths (deep links / reloads into the
 * Topics section, which is nested under the assistant AI group) to the topic's EID, so navigating to a
 * topic child node doesn't 404.
 */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      AppCapabilities.NavigationPathResolver,
      TypeSection.createTypeSectionPathResolver(Topic.Topic, { groupId: Paths.GroupSegments.ai }),
    ),
  ),
);
