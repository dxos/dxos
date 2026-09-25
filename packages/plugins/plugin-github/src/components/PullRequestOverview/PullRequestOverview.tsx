//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { DxAnchor } from '@dxos/lit-ui/react';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { Field, Flex, Icon, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { MarkdownLink, MarkdownView, type MarkdownViewProps } from '@dxos/react-ui-markdown';

import { meta } from '#meta';
import { type GitHubOperation } from '#types';

import { parseArtifactLink, parsePullRequestBody } from '../../pull-request-body.ts';
import { ArtifactPill } from './ArtifactPill.tsx';
import { CheckRunList, useCheckSummary } from './CheckRunList.tsx';
import { PullRequestDetails, type PullRequestDetailsValues } from './PullRequestDetails.tsx';
import { RelatedCards, useRelatedItems } from './RelatedCards.tsx';

export type PullRequestOverviewProps = {
  /** The pull request's description as written on GitHub, footers included. */
  body?: string;
  details: PullRequestDetailsValues;
  /** Undefined while the status is loading. */
  runs?: readonly GitHubOperation.CheckRun[];
};

/**
 * A pull request as its author presented it: the description, the facts about it, what it links to
 * beyond the diff, and every check on its head commit.
 */
export const PullRequestOverview = ({ body, details, runs }: PullRequestOverviewProps) => {
  const { t } = useTranslation(meta.profile.key);
  const parsed = useMemo(() => parsePullRequestBody(body), [body]);
  const components = useBodyComponents();
  const related = useRelatedItems(parsed);
  const checkSummary = useCheckSummary(runs);

  return (
    <ScrollArea.Root thin>
      <ScrollArea.Viewport>
        <Flex column gap='form-section' classNames='w-full max-w-[min(72rem,100%-3rem)] mx-auto py-4'>
          {parsed.markdown ? (
            <MarkdownView content={parsed.markdown} components={components} data-testid='pull-request.body' />
          ) : (
            <Empty label={t('no-description.message')} />
          )}
          <Section label={t('details.label')}>
            <PullRequestDetails values={details} />
          </Section>
          {related.length > 0 && (
            <Section label={t('related.label')}>
              <RelatedCards items={related} />
            </Section>
          )}
          <Section label={checkSummary}>
            <CheckRunList runs={runs} />
          </Section>
        </Flex>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

/** A labelled group, labelled the way a form field is. */
const Section = ({ label, children }: PropsWithChildren<{ label: string }>) => (
  <Flex column gap='form'>
    <Field.Root>
      <Field.Label>{label}</Field.Label>
    </Field.Root>
    {children}
  </Flex>
);

/**
 * Links in the body as pills: an artifact previews its media in place, and a link a preview
 * resolver answers (another pull request, an issue) becomes the anchor chip the editor makes of it.
 */
const useBodyComponents = (): MarkdownViewProps['components'] => {
  const resolvers = useCapabilities(PreviewCapabilities.LinkResolver);
  return useMemo(
    () => ({
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
