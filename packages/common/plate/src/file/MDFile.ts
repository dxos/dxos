//
// Copyright 2022 DXOS.org
//

import prettier from 'prettier';

import { File } from './File';

export class MDFile extends File<string> {
  protected override async serialize(): Promise<string> {
    const content = this.content?.toString() ?? '';
    const formatted = await prettier.format(content, {
      parser: 'markdown',
    });
    return formatted;
  }
}
