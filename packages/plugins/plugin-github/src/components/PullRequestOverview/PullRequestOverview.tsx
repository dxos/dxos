//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { DxAnchor } from '@dxos/lit-ui/react';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { Icon, useTranslation } from '@dxos/react-ui';
import { MarkdownLink, MarkdownView, type MarkdownViewProps } from '@dxos/react-ui-markdown';

import { meta } from '#meta';
import { type GitHubOperation } from '#types';

import { parseArtifactLink, parsePullRequestBody } from '../../pull-request-body.ts';
import { ArtifactPill } from './ArtifactPill.tsx';
import { CheckRunList } from './CheckRunList.tsx';
import { RelatedCards } from './RelatedCards.tsx';

export type PullRequestOverviewProps = {
  /** The pull request's description as written on GitHub, footers included. */
  body?: string;
  url?: string;
  baseBranch?: string;
  headBranch?: string;
  /** Undefined while the status is loading. */
  runs?: readonly GitHubOperation.CheckRun[];
};

/**
 * A pull request as its author presented it: the description, what it links to beyond the diff,
 * and every check on its head commit.
 */
export const PullRequestOverview = ({ body, url, baseBranch, headBranch, runs }: PullRequestOverviewProps) => {
  const { t } = useTranslation(meta.profile.key);
  const parsed = useMemo(() => parsePullRequestBody(body), [body]);
  const components = useBodyComponents();
  const hasRelated =
    parsed.artifacts.length > 0 || !!parsed.previewUrl || !!parsed.claudeCode || headBranch !== undefined;

  return (
    <div className='flex flex-col gap-6 w-full max-w-[min(72rem,100%-3rem)] mx-auto py-4'>
      {parsed.markdown ? (
        <MarkdownView content={parsed.markdown} components={components} data-testid='pull-request.body' />
      ) : (
        <p className='text-description'>{t('no-description.message')}</p>
      )}
      {hasRelated && (
        <Section title={t('related.label')}>
          <RelatedCards {...parsed} url={url} baseBranch={baseBranch} headBranch={headBranch} />
        </Section>
      )}
      <Section title={t('checks.label')}>
        <CheckRunList runs={runs} />
      </Section>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className='flex flex-col gap-2'>
    <h2 className='text-sm font-medium uppercase text-description'>{title}</h2>
    {children}
  </section>
);

/**
 * Links in the body as pills: an artifact previews its media in place, and a link a preview
 * resolver answers (another pull request, an issue) becomes the anchor chip the editor makes of it.
 */
const useBodyComponents = (): MarkdownViewProps['components'] => {
  const resolvers = useCapabilities(PreviewCapabilities.LinkResolver);
  return useMemo(
    () => ({
      // The default renderer leaves a table unruled, which reads as run-on text in a before/after grid.
      table: ({ children }) => <table className='my-2 border-collapse'>{children}</table>,
      th: ({ children }) => <th className='px-2 py-1 border border-separator text-start'>{children}</th>,
      td: ({ children }) => <td className='px-2 py-1 border border-separator'>{children}</td>,
      a: ({ children, href, node: _node, ...props }) => {
        const artifact = href ? parseArtifactLink(href) : undefined;
        if (artifact) {
          return <ArtifactPill artifact={artifact}>{children}</ArtifactPill>;
        }
        const all = resolvers.flat();
        if (!href || !PreviewCapabilities.isPreviewLink(all, href)) {
          return (
            <MarkdownLink href={href} {...props}>
              {children}
            </MarkdownLink>
          );
        }
        const icon = PreviewCapabilities.linkIcon(all, href);
        return (
          <DxAnchor eid={href} className='dx-tag--anchor'>
            {icon && (
              <Icon icon={icon.icon} size={4} classNames={['inline-block align-[-0.125em] me-1', icon.classNames]} />
            )}
            {children === href ? (PreviewCapabilities.linkLabel(all, href) ?? children) : children}
          </DxAnchor>
        );
      },
    }),
    [resolvers],
  );
};
