//
// Copyright 2026 DXOS.org
//

/**
 * Key of the trip blueprint. Lives here (not in the blueprint module) so the Trip schema can
 * reference it via {@link BlueprintsAnnotation} without importing the blueprint (which would create
 * a cycle through the operation definitions).
 *
 * Must be a dotted reverse-DNS key (NOT a `/`-path): `Blueprint.registryURI` resolves it as
 * `dxn:<key>`, and slashes make the DXN invalid, yielding an unresolvable Ref URI at bind time.
 */
export const TRIP_BLUEPRINT_KEY = 'org.dxos.blueprint.trip';
