//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/Hooks';
import { DxAnchor } from '@dxos/lit-ui/react';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { Form } from '@dxos/react-ui-form';
import { MarkdownLink, MarkdownView, type MarkdownViewProps } from '@dxos/react-ui-markdown';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { meta } from '#meta';
import { type GitHubOperation } from '#types';

import { parseArtifactLink, parsePullRequestBody } from '../../pull-request-body.ts';
import { ArtifactPill } from './ArtifactPill.tsx';
import { CheckRunList, useCheckSummary } from './CheckRunList.tsx';
import { PullRequestDetailsSchema, type PullRequestDetailsValues } from './PullRequestDetails.tsx';
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const parsed = useMemo(() => parsePullRequestBody(body), [body]);
  const components = useBodyComponents();
  const related = useRelatedItems(parsed);
  const checkSummary = useCheckSummary(runs);

  // One form hosts the whole tab, so the description and every section share its viewport's column
  // rather than each nesting a gutter of its own.
  return (
    <Form.Root schema={PullRequestDetailsSchema} values={details} layout='static' readonly>
      <Form.Viewport scroll>
        <Form.Content>
          {parsed.markdown ? (
            <MarkdownView content={parsed.markdown} components={components} data-testid='pull-request.body' />
          ) : (
            <Banner.Empty label={t('no-description.message')} />
          )}
          <Form.FieldSet label={t('details.label')} data-testid='pull-request.details'>
            <Form.Fields />
          </Form.FieldSet>
          {related.length > 0 && (
            <Form.FieldSet label={t('related.label')}>
              <RelatedCards items={related} />
            </Form.FieldSet>
          )}
          <Form.FieldSet label={checkSummary}>
            <CheckRunList runs={runs} />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

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
              <Icon.Root
                icon={icon.icon}
                size={4}
                classNames={['inline-block align-[-0.125em] me-1', icon.classNames]}
              />
            )}
            {children === href ? (PreviewCapabilities.linkLabel(all, href) ?? children) : children}
          </DxAnchor>
        );
      },
    }),
    [resolvers],
  );
};
