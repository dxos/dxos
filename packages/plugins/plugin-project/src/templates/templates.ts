//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/react-client/echo';
import { type DataType } from '@dxos/schema';

import { createResearchProject } from './research';

export const templates: Record<string, (space: Space) => Promise<DataType.Project | null>> = {
  'org-research': createResearchProject,
};
