//
// Copyright 2023 DXOS.org
//

import { EchoDatabase } from '@dxos/echo-schema';

import { Project } from '../proto';
import { Bot } from './bot';

/**
 * Adds info to records.
 */
export class ResearchBot extends Bot<Project> {
  constructor(db: EchoDatabase) {
    super(db, Project.filter());
  }
}
