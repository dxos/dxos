//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';

import { RecordVisit } from '../types/BookmarkOperation.ts';

// #region skill
export const key = 'com.example.skill.bookmarks';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Bookmarks',
    tools: Skill.toolDefinitions({ operations: [RecordVisit] }),
    instructions: Template.make({
      source: 'When the user says they opened a bookmark, record a visit to it.',
    }),
  });
// #endregion
