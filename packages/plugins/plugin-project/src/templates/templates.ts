import { type Database } from '@dxos/echo';
import { type Project } from '@dxos/types';
//
// Copyright 2025 DXOS.org
//

import { createResearchProject } from './research';

export const templates: Record<string, (db: Database.Database) => Promise<Project.Project | null>> = {
  'org-research': createResearchProject,
};
