import { type Database } from '@dxos/echo';
import { type Pipeline } from '@dxos/types';
//
// Copyright 2025 DXOS.org
//

import { createResearchProject } from './research';

export const templates: Record<string, (db: Database.Database) => Promise<Pipeline.Pipeline | null>> = {
  'org-research': createResearchProject,
};
