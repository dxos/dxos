//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, Paths, TypeSection } from '@dxos/app-toolkit';
import { Project } from '@dxos/compute';

/**
 * Resolves `root/<spaceId>/<ai-group>/<project-typename>/<objectId>` paths (deep links / reloads into
 * the Projects section, which is nested under the assistant AI group) to the project's EID, so
 * navigating to a project child node doesn't 404.
 */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      AppCapabilities.NavigationPathResolver,
      TypeSection.createTypeSectionPathResolver(Project.Project, { groupId: Paths.GroupSegments.ai }),
    ),
  ),
);
