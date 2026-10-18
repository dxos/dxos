//
// Copyright 2026 DXOS.org
//

// Project addresses (D184, D185, Address.Spec): `@owner/project`, where the owner is a GitHub login. A
// project lives in the bucket folder `<owner>/<project>/`, except projects older than addresses,
// which keep their folder. The rules are DEUS (`Address.projectAt` and the functions after it in
// deus/address.deus), compiled into gen/address.js by `node scripts/build-worker.mjs --live` (task 41714c0d).

import * as deus from './gen/address.js';

/**
 * The project a path names, from its leading segments: `@owner`, `project` or a legacy folder.
 * Returns the project and how many segments it used, or undefined when they name none.
 */
export const projectAt = (segments) => deus.projectAt(segments);

/** The project whose folder is `folder`, so a key granted either name may write to it. */
export const addressOfFolder = (folder) => deus.addressOfFolder(folder);

/** A project a key may be granted: an address, every project of an owner (`@owner/*`), or a legacy folder name. */
export const isGrantable = (project) => typeof project === 'string' && deus.isGrantable(project);

/** Whether a key granted `projects` (`'*'`, or a list) may write to the project in `folder`. */
export const grants = (projects, folder) => projects === '*' || deus.grants(projects, folder);
