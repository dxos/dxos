//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import minimatch from 'minimatch';
import readdir from 'recursive-readdir';
import { codeImport } from 'remark-code-import';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { Remark } from './apiDocDirective.js';
import { type Config } from './config.js';
import { warn, info } from './log.js';

export const remarkDocumentation = async (config: Config) => {
  const { include } = config;
  const files = await readdir('.', ['node_modules', '.git', '.npm']);
  const eligibleFiles = files.filter((file) => include.some((pattern) => minimatch(file, pattern)));
  const promises = eligibleFiles.map(async (file) => {
    const content = await fs.readFile(file, 'utf8');
    try {
      const processed = await unified()
        .use(remarkParse)
        .use(remarkFrontmatter)
        .use(remarkDirective)
        // TODO(wittjosiah): Fix remark plugin types.
        //   Our plugin types change the type of the chain such that all following plugins require arrays.
        .use([Remark.apiDocGenerateDirective])
        .use([codeImport as any])
        // .use([unifiedPrettier as any]) // TODO(burdon): Hack.
        .use([remarkStringify as any]) // TODO(burdon): Hack.
        .process(
          new VFile({
            path: file,
            value: content,
          }),
        );
      if (content !== processed.value && !!processed.value) {
        info('updated', file);
        // fix invalid \::: directives as a quick hack here
        const content2 = processed.value.toString().replace(/\\:::/g, ':::');
        await fs.writeFile(file, content2);
      }
    } catch (err: any) {
      warn(`problem in file ${file}: ${err.message}`);
    }
  });
  await Promise.all(promises);
};
