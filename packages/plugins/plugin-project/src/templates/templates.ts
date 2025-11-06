import { type Space } from '@dxos/react-client/echo';
import { type Project } from '@dxos/types';
//
// Copyright 2025 DXOS.org
//

import { createResearchProject } from './research';

export const templates: Record<string, (space: Space) => Promise<Project.Project | null>> = {
  'org-research': createResearchProject,
};
