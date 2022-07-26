//
// Copyright 2022 DXOS.org
//

import rehypeStringify from 'rehype-stringify';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkLint from 'remark-lint';
import remarkNormalizeHeadings from 'remark-normalize-headings';
import remarkRehype from 'remark-rehype';

import { remarkHeadings } from './remark-headings.js';
import { remarkLinker } from './remark-linker.js';
import { remarkSnippets } from './remark-snippets.js';

interface Options {
  autoNumber?: boolean
  baseDir?: string
  html?: boolean
}

/**
 * Create remark parser with plugins.
 */
export const createParser = ({
  autoNumber,
  baseDir,
  html
}: Options): any => {
  // https://github.com/remarkjs/awesome-remark
  const unified = remark()
    // https://github.com/remarkjs/remark-gfm
    .use(remarkGfm as any)
    // TODO(burdon): https://github.com/remarkjs/remark-lint
    .use(remarkLint as any)
    // https://github.com/remarkjs/remark-normalize-headings
    .use(remarkNormalizeHeadings as any)

    // TODO(burdon): Why TS errors?
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkSnippets, { baseDir })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkLinker, { baseDir })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkHeadings, { autoNumber });

  if (html) {
    unified
      .use(remarkRehype as any)
      .use(rehypeStringify as any);
  }

  return unified;
};
