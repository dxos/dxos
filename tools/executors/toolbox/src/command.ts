//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import path from 'path';

import { Workspace } from './workspace';

export interface Config {
  config: {
    package: {
      common: string[];
    };
  };
}

export interface ToolkitOptions {
  args: string;
}

/**
 * Base command for toolbox.
 */
export abstract class Command {
  constructor(
    public readonly config: Config,
    public readonly options: ToolkitOptions,
    public readonly context: ExecutorContext,
    public readonly workspace: Workspace
  ) {
    this.onInit();
  }

  get path() {
    const { workspace, projectName } = this.context;
    const project = workspace.projects[projectName!];
    return path.join(this.context.root, project.root);
  }

  abstract exec(): Promise<boolean>;

  onInit() {}
}
