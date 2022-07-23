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
  toc?: string
  html?: boolean
}

/**
 * Generate parser.
 */
export const createParser = ({ baseDir, toc, html }: Options): any => {
  // https://github.com/remarkjs/awesome-remark
  const unified = remark()
    .use(remarkGfm as any)
    .use(remarkLint as any)
    .use(remarkNormalize as any)

    // TODO(burdon): Why TS errors?
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkSnippets, { baseDir })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkLinker, { baseDir })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .use(remarkHeading, { toc });

  if (toc) {
    unified
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .use(remarkToc as any, { heading: toc });
  }

  if (html) {
    unified
      .use(remarkRehype as any)
      .use(rehypeStringify as any);
  }

  return unified;
};
