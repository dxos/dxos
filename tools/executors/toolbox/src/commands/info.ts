//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { Table } from 'console-table-printer';

import { Command } from '../command';

/**
 * Log info about each project.
 */
export class InfoCommand extends Command {
  async exec() {
    const table = new Table({
      columns: [
        { name: 'package', alignment: 'left' },
        { name: 'name', alignment: 'left' },
        { name: 'path', alignment: 'left' },
        { name: 'access', alignment: 'left' }
      ]
    });

    // TODO(burdon): Sort by tools, packages.
    await this.workspace.visitProjects((packageName, name, project) => {
      const { private: isPrivate } = this.workspace.getPackage(packageName);
      table.addRow({
        package: chalk.green(packageName),
        name: chalk.blue(name),
        path: chalk.grey(project.sourceRoot),
        access: isPrivate ? chalk.red('private') : chalk.green('public')
      });
    });

    console.log(table.render());
    return true;
  }
}
