//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Card, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type ArtifactLink, type PullRequestBody } from '../../pull-request-body.ts';
import { ArtifactMedia, artifactIcon } from './ArtifactPill.tsx';

export type RelatedCardsProps = Pick<PullRequestBody, 'artifacts' | 'claudeCode' | 'previewUrl'> & {
  url?: string;
  baseBranch?: string;
  headBranch?: string;
};

/**
 * What the pull request points at beyond its diff, one card each: its demo media, the preview
 * deployment built from it, and the session that wrote it.
 */
export const RelatedCards = ({ artifacts, claudeCode, previewUrl, url, baseBranch, headBranch }: RelatedCardsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const sessionId = claudeCode?.sessionUrl?.split('/').at(-1);

  return (
    <div
      className='grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] items-start gap-3'
      data-testid='pull-request.related'
    >
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.url} artifact={artifact} />
      ))}
      {previewUrl && (
        <LinkCard
          icon='ph--rocket-launch--regular'
          iconClassNames='text-green-500'
          title={t('preview-deployment.label')}
          href={previewUrl}
          detail={hostOf(previewUrl)}
          testId='pull-request.related.preview'
        />
      )}
      {claudeCode && (
        <LinkCard
          icon='px--anthropic--regular'
          iconClassNames='text-amber-500'
          title={claudeCode.sessionUrl ? t('claude-session.label') : t('claude-generated.label')}
          href={claudeCode.sessionUrl}
          detail={sessionId}
          testId='pull-request.related.claude'
        />
      )}
      {headBranch && (
        <LinkCard
          icon='ph--git-branch--regular'
          title={t('branches.label')}
          href={url}
          detail={baseBranch ? `${headBranch} → ${baseBranch}` : headBranch}
          testId='pull-request.related.branches'
        />
      )}
    </div>
  );
};

/** A demo video or screenshot, playable in the card itself. */
const ArtifactCard = ({ artifact }: { artifact: ArtifactLink }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Card.Root data-testid='pull-request.related.artifact'>
      <CardHeading
        icon={artifactIcon[artifact.kind]}
        title={artifact.label ?? t(`artifact-${artifact.kind}.label`)}
        href={artifact.url}
      />
      <Card.Row>
        <Card.Text variant='description' truncate>
          {artifact.name}
        </Card.Text>
      </Card.Row>
      {artifact.kind !== 'file' && (
        <Card.Body>
          {/* `col-span-3` spans the card's gutters, as `Card.Poster` does; the body is `display: contents`. */}
          <ArtifactMedia artifact={artifact} classNames='col-span-3 aspect-video max-h-[200px] object-cover' />
        </Card.Body>
      )}
    </Card.Root>
  );
};

type LinkCardProps = {
  icon: string;
  iconClassNames?: string;
  title: string;
  href?: string;
  detail?: ReactNode;
  testId?: string;
};

const LinkCard = ({ icon, iconClassNames, title, href, detail, testId }: LinkCardProps) => (
  <Card.Root data-testid={testId}>
    <CardHeading icon={icon} iconClassNames={iconClassNames} title={title} href={href} />
    {detail && (
      <Card.Row>
        <Card.Text variant='description' truncate>
          {detail}
        </Card.Text>
      </Card.Row>
    )}
  </Card.Root>
);

const CardHeading = ({
  icon,
  iconClassNames,
  title,
  href,
}: {
  icon: string;
  iconClassNames?: string;
  title: string;
  href?: string;
}) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Card.Header>
      <Card.Block>
        <Icon icon={icon} classNames={iconClassNames} />
      </Card.Block>
      <Card.Title>{title}</Card.Title>
      {href && (
        <Card.Block end>
          <a href={href} target='_blank' rel='noopener noreferrer' aria-label={t('open-link.label')} title={href}>
            <Icon icon='ph--arrow-square-out--regular' size={4} />
          </a>
        </Card.Block>
      )}
    </Card.Header>
  );
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};
