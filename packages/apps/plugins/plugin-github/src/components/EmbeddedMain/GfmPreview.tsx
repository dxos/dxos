//
// Copyright 2023 DXOS.org
//

import 'github-markdown-css/github-markdown.css';
import DOMPurify from 'dompurify';
import React, { useEffect, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';

import { GITHUB_PLUGIN } from '../../meta';
import { GitHubSettings, useOctokitContext } from '../GithubApiProviders';
import { Loading } from '../Loading';

const defaultOptions: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    'span',
    'div',
    'b',
    'i',
    'em',
    'strong',
    'a',
    'p',
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
  ALLOWED_ATTR: ['class', 'href', 'target', 'hidden', 'title', 'type', 'role', 'align', 'data-footnote-ref'],
};

const sanitize = (dirty: string, options: Partial<Parameters<typeof DOMPurify.sanitize>[1]>) => ({
  __html: DOMPurify.sanitize(dirty, { ...defaultOptions, ...options }) as string,
});

export type GfmPreviewProps = {
  markdown: string;
  owner?: string;
  repo?: string;
};

export const GfmPreview = ({ markdown, owner, repo }: GfmPreviewProps) => {
  const [html, setHtml] = useState('');
  const { octokit } = useOctokitContext();
  const { t } = useTranslation(GITHUB_PLUGIN);

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
    <>
      <style>{'.markdown-body ol, .markdown-body ul {list-style-type: disc; list-style-position: outside;}'}</style>
      <article
        className='markdown-body grow is-full max-is-[980px] mli-auto p-[15px] sm:pli-[45px] sm:plb-[30px]'
        dangerouslySetInnerHTML={sanitize(html, {})}
      />
    </>
  ) : (
    <div role='none' className='mli-auto max-is-md pli-2 text-center'>
      {!octokit && <p className='mlb-4 text-lg font-system-medium'>{t('empty github pat message')}</p>}
      {octokit ? <Loading label={t('loading preview message')} /> : <GitHubSettings />}
    </div>
  );
};
