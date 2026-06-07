//
// Copyright 2026 DXOS.org
//

import { meta } from '#meta';

/** Key of the trip-planning blueprint. Lives here (not in the blueprint module) so the Trip schema
 * can reference it via {@link BlueprintsAnnotation} without importing the blueprint (which would
 * create a cycle through the operation definitions). */
export const TRIP_PLANNING_BLUEPRINT_KEY = `${meta.id}/blueprint/planning`;
