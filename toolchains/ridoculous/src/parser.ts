//
// Copyright 2022 DXOS.org
//

import rehypeStringify from 'rehype-stringify';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkLint from 'remark-lint';
import remarkNormalize from 'remark-normalize-headings';
import remarkRehype from 'remark-rehype';
import remarkToc from 'remark-toc';

import { remarkHeading } from './remark-heading.js';
import { remarkLinker } from './remark-linker.js';
import { remarkSnippets } from './remark-snippets.js';

interface Options {
  baseDir?: string
  heading?: string
  html?: boolean
}

/**
 * Generate parser.
 */
export const createParser = ({ baseDir, heading, html }: Options): any => {
  // TODO(burdon): Why TS errors (e.g., as any? tsconfig?)
  // https://github.com/remarkjs/awesome-remark
  const unified = remark()
    .use(remarkGfm as any)
    .use(remarkLint as any)
    .use(remarkNormalize as any)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkSnippets, { baseDir })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkLinker, { baseDir })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkHeading, { heading })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkToc as any, { heading });

  if (html) {
    unified
      .use(remarkRehype as any)
      .use(rehypeStringify as any);
  }

  return unified;
};
