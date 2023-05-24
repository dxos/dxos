//
// Copyright 2023 DXOS.org
//

import 'github-markdown-css/github-markdown.css';
import DOMPurify from 'dompurify';
import React, { useEffect, useState } from 'react';

import { useTranslation } from '@dxos/aurora';
import { Loading } from '@dxos/react-appkit';

import { useOctokitContext } from '../../components';

const defaultOptions = {
  ALLOWED_TAGS: [
    'b',
    'i',
    'em',
    'strong',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'table',
    'td',
    'th',
    'tr',
    'span',
    'blockquote',
    'ul',
    'ol',
    'li',
    'dd',
    'tt',
    'dl',
    'dt',
    'details',
    'figcaption',
    'figure',
    'summary',
    'abbr',
    'dfn',
    'mark',
    'sub',
    'sup',
    'img',
    'code',
    'kbd',
    'pre',
    'samp',
    'hr',
    'input',
    'pre',
    'del',
    'g-emoji',
    'label',
  ],
  ALLOWED_ATTR: ['href', 'target'],
};

const sanitize = (dirty: string, options: Partial<Parameters<typeof DOMPurify.sanitize>[1]>) => ({
  __html: DOMPurify.sanitize(dirty, { ...defaultOptions, ...options }),
});

export type GfmPreviewProps = {
  markdown: string;
  owner?: string;
  repo?: string;
};

export const GfmPreview = ({ markdown, owner, repo }: GfmPreviewProps) => {
  const [html, setHtml] = useState('');
  const { octokit } = useOctokitContext();
  const { t } = useTranslation('composer');
  useEffect(() => {
    if (octokit && markdown) {
      void octokit
        .request('POST /markdown', {
          text: markdown,
          ...(owner && repo && { context: `${owner}/${repo}` }),
        })
        .then(
          ({ data }) => setHtml(data),
          () => {},
        );
    }
  }, [markdown, octokit]);
  return html ? (
    <article
      className='markdown-body max-is-[980px] mli-auto p-[15px] sm:pli-[45px] sm:plb-[30px]'
      dangerouslySetInnerHTML={sanitize(html, {})}
    />
  ) : (
    <Loading label={t('loading preview message')} />
  );
};
