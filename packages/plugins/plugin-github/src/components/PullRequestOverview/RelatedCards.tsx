//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Card, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';

import { type ArtifactLink, type PullRequestBody } from '../../pull-request-body.ts';
import { ArtifactMedia, artifactIcon } from './ArtifactPill.tsx';

/** One tile of the related grid: a demo artifact, or a link out of the pull request. */
export type RelatedItem =
  | { kind: 'artifact'; id: string; artifact: ArtifactLink }
  | { kind: 'link'; id: string; icon: string; iconClassNames?: string; title: string; href?: string; detail?: string };

export type RelatedCardsProps = Pick<PullRequestBody, 'artifacts' | 'claudeCode' | 'previewUrl'>;

/** What {@link RelatedCards} would show; empty when the pull request links to nothing beyond its diff. */
export const useRelatedItems = ({ artifacts, claudeCode, previewUrl }: RelatedCardsProps): RelatedItem[] => {
  const { t } = useTranslation(meta.profile.key);
  return useMemo(() => {
    const items: RelatedItem[] = artifacts.map((artifact) => ({ kind: 'artifact', id: artifact.url, artifact }));
    if (previewUrl) {
      items.push({
        kind: 'link',
        id: 'preview',
        icon: 'ph--rocket-launch--regular',
        iconClassNames: 'text-success-text',
        title: t('preview-deployment.label'),
        href: previewUrl,
        detail: hostOf(previewUrl),
      });
    }
    if (claudeCode) {
      items.push({
        kind: 'link',
        id: 'claude',
        icon: 'px--anthropic--regular',
        iconClassNames: 'text-warning-text',
        title: claudeCode.sessionUrl ? t('claude-session.label') : t('claude-generated.label'),
        href: claudeCode.sessionUrl,
        detail: claudeCode.sessionUrl?.split('/').at(-1),
      });
    }
    return items;
  }, [artifacts, claudeCode, previewUrl, t]);
};

/**
 * What the pull request points at beyond its diff, one card each — its demo media, the preview
 * deployment built from it, and the session that wrote it — in the masonry grid related objects
 * use everywhere else. Renders inside its host's scroller rather than owning one.
 */
export const RelatedCards = ({ items }: { items: readonly RelatedItem[] }) => (
  <Masonry.Root Tile={RelatedCard} centered={false}>
    <Masonry.Viewport items={items} getId={(item: RelatedItem) => item.id} scroll={false} />
  </Masonry.Root>
);

const RelatedCard = ({ data: item }: { data: RelatedItem }) => {
  const { t } = useTranslation(meta.profile.key);
  if (item.kind === 'link') {
    return (
      <Card.Root data-testid={`pull-request.related.${item.id}`}>
        <CardHeading icon={item.icon} iconClassNames={item.iconClassNames} title={item.title} href={item.href} />
        {item.detail && (
          <Card.Row>
            <Card.Text variant='description' truncate>
              {item.detail}
            </Card.Text>
          </Card.Row>
        )}
      </Card.Root>
    );
  }

  const { artifact } = item;
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
          <IconButton
            iconOnly
            variant='ghost'
            icon='ph--arrow-square-out--regular'
            label={t('open-link.label')}
            onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
          />
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
