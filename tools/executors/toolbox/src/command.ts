//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import fs from 'fs';
import path from 'path';

export interface Config {
  config: {
    package: {
      common: string[]
    }
  }
}

export interface ToolkitOptions {
  _: string[]
  basePath: string
}

/**
 * Base command for toolbox.
 */
export abstract class Command {
  static loadJson = (filename: string) => {
    const json = fs.readFileSync(filename, 'utf-8');
    return json ? JSON.parse(json) : undefined;
  };

  constructor (
    public readonly config: Config,
    public readonly options: ToolkitOptions,
    public readonly context: ExecutorContext
  ) {
    this.onInit();
  }

  onInit () {}

  get path () {
    const { workspace, projectName } = this.context;
    const project = workspace.projects[projectName!];
    return path.join(this.context.root, project.root);
  }

  abstract exec (): Promise<void>;
}
