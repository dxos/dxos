//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Carousel from '@dxos/react-ui/Carousel';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { Tag } from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';

import { type Entity, type Extension } from '../../client/types.ts';
import { type Rating } from '../../model/rating.ts';
import { type CardModel, factsOf } from '../../model/results.ts';
import { LighthouseNamespace } from '../../namespace.ts';
import { LocationPopover } from '../LocationPopover/LocationPopover.tsx';
import { type AreaNote } from '../ResultCard/ResultCard.tsx';

/** The predicate an extension field is stored under (mirrors lighthouse `src/extend/Extend.ts` fieldPredicate). */
const fieldPredicate = (extension: string, field: string) =>
  `lh:${extension.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}${field.charAt(0).toUpperCase()}${field.slice(1)}`;

const words = (field: string) => field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

const Heading = ({ children }: { children: string }) => (
  <Typography.Text classNames='text-xs uppercase tracking-wide text-fg-subtle'>{children}</Typography.Text>
);

const first = (entity: Entity, predicate: string | undefined) =>
  predicate ? entity.props[predicate]?.at(-1) : undefined;

/** A deep extension's items (a menu's dishes), grouped by their section, with prices. */
const ResearchItems = ({
  extension,
  research,
}: {
  extension: Extension;
  research: { status: string; busy: boolean; items: readonly Entity[] };
}) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const fields = extension.research?.fields ?? {};
  // The extension names a section predicate the items may not use (lh:menuItemSection vs lh:menuSection): fall
  // back to the items' own *Section property.
  const sectionKey =
    fields.section && research.items.some((item) => item.props[fields.section ?? ''])
      ? fields.section
      : research.items.flatMap((item) => Object.keys(item.props)).find((key) => /Section$/.test(key));
  const sections = new Map<string, Entity[]>();
  for (const item of research.items) {
    const section = String(first(item, sectionKey) ?? '');
    sections.set(section, [...(sections.get(section) ?? []), item]);
  }
  return (
    <Layout.Flex column gap='xs' data-testid={`lighthouse.research.${extension.id}`}>
      <span className='text-sm text-fg-muted'>
        {research.busy
          ? t('research-running.label')
          : t('research-items.label', { count: research.items.length, items: extension.research?.items ?? '' })}
      </span>
      {research.items.length > 0 && (
        <Layout.Flex column gap='sm' classNames='max-h-96 overflow-y-auto pe-1'>
          {[...sections.entries()].map(([section, items]) => (
            <Layout.Flex key={section || '-'} column gap='xs'>
              {section && <Heading>{section}</Heading>}
              {items.map((item) => {
                const price = first(item, fields.price);
                const currency = first(item, fields.currency);
                const description = first(item, fields.description);
                return (
                  <Layout.Grid key={item.id} cols={['fill', 'min']} gap='sm' align='start' classNames='text-sm'>
                    <Layout.Flex column classNames='min-w-0'>
                      <span>{String(first(item, fields.name ?? 'schema:name') ?? item.id)}</span>
                      {description !== undefined && (
                        <span className='text-xs text-fg-muted line-clamp-2'>{String(description)}</span>
                      )}
                    </Layout.Flex>
                    {price !== undefined && (
                      <span className='tabular-nums whitespace-nowrap'>
                        {typeof price === 'number' ? price.toLocaleString() : String(price)}
                        {currency !== undefined ? ` ${String(currency)}` : ''}
                      </span>
                    )}
                  </Layout.Grid>
                );
              })}
            </Layout.Flex>
          ))}
        </Layout.Flex>
      )}
    </Layout.Flex>
  );
};

export type ResultDetailProps = {
  entity: Entity;
  card: CardModel;
  rating?: Rating;
  starred?: boolean;
  /** Extensions that apply to the result's types. */
  extensions?: readonly Extension[];
  /** The extension nodes already read for this result, by extension id. */
  extensionNodes?: Readonly<Record<string, Entity>>;
  /** Extensions being read, by `id` (quick) or `id:deep`. */
  busy?: Readonly<Record<string, boolean>>;
  /** The agent's reason, when the result is a pick. */
  why?: string;
  /** As on the result's card: outside the drawn areas, or no point. */
  areaNote?: AreaNote;
  /** Deep extensions' research sessions, by extension id: their status and the items they collected. */
  research?: Readonly<Record<string, { status: string; busy: boolean; items: readonly Entity[] }>>;
  onToggleStar?: () => void;
  onExtend?: (extension: string, deep: boolean) => void;
  onClose?: () => void;
};

/**
 * Detail of one result, for the companion: the entity's facts with where they came from, its extension sections, and
 * "More about this" to read another facet (a quick read, or a deep research session for a full list).
 */
export const ResultDetail = ({
  entity,
  card,
  rating,
  starred = false,
  extensions = [],
  extensionNodes = {},
  busy = {},
  why,
  areaNote,
  research = {},
  onToggleStar,
  onExtend,
  onClose,
}: ResultDetailProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const facts = factsOf(entity);
  const read = extensions.filter((extension) => extensionNodes[extension.id] || research[extension.id]);
  const unread = extensions.filter((extension) => !extensionNodes[extension.id] && !research[extension.id]);

  return (
    <Layout.Flex column gap='md' classNames='p-trim-md' data-testid='lighthouse.detail'>
      <Layout.Grid cols={['fill', 'min', 'min']} gap='sm' align='start'>
        <Layout.Flex column gap='xs' classNames='min-w-0'>
          {card.eyebrow && <Heading>{card.eyebrow}</Heading>}
          <h2 className='text-lg font-medium'>{card.title}</h2>
        </Layout.Flex>
        <SystemButton.Star iconOnly variant='ghost' pressed={starred} onClick={onToggleStar} />
        {onClose && (
          <Button.Root iconOnly variant='ghost' icon='ph--x--regular' label={t('close.label')} onClick={onClose} />
        )}
      </Layout.Grid>

      <Layout.Flex gap='sm' align='center' wrap>
        {card.price && <span className='font-mono text-lg font-semibold tabular-nums'>{card.price}</span>}
        {card.tags.map((tag) => (
          <Tag key={tag.label} hue={tag.hue ?? 'neutral'}>
            {tag.label}
          </Tag>
        ))}
        {rating && (
          <span className='text-sm text-fg-muted tabular-nums'>
            {t('score.label', { score: Math.round(rating.score * 100) })}
          </span>
        )}
      </Layout.Flex>

      {card.url && (
        <Typography.Link href={card.url} target='_blank' rel='noreferrer' classNames='text-sm truncate'>
          {card.url}
        </Typography.Link>
      )}

      {(card.geo || card.unlocated) && (
        <Layout.Flex gap='xs' align='center' classNames='text-sm min-w-0' data-testid='lighthouse.detail.location'>
          <Icon.Icon icon='ph--map-pin--regular' classNames='shrink-0 text-fg-subtle' />
          {card.geo ? (
            <LocationPopover point={card.geo} address={card.geo.address}>
              {card.geo.address}
            </LocationPopover>
          ) : (
            <span className='text-fg-muted'>{t('geo-no-location.label')}</span>
          )}
          {areaNote === 'outside' && (
            <span className='text-xs text-fg-subtle whitespace-nowrap' data-testid='lighthouse.card.geo-note'>
              {t('geo-outside.label')}
            </span>
          )}
        </Layout.Flex>
      )}

      {why && <Typography.Text classNames='text-sm whitespace-normal'>{why}</Typography.Text>}

      {card.images.length > 0 && (
        // A logo is often dark on transparent: a light ground keeps it visible in either theme.
        <Carousel.Root count={card.images.length} classNames={card.logo ? 'bg-white rounded-sm' : undefined}>
          <Carousel.PrevTrigger />
          <Carousel.ItemGroup>
            {card.images.map((image, index) => (
              <Carousel.Item key={image} index={index} src={image} alt={card.title} />
            ))}
          </Carousel.ItemGroup>
          <Carousel.NextTrigger />
          <Carousel.IndicatorGroup />
        </Carousel.Root>
      )}

      {rating && rating.terms.length > 0 && (
        <Layout.Flex column gap='xs'>
          <Heading>{t('rating.label')}</Heading>
          <dl className='grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm'>
            {rating.terms.map((term) => (
              <Fragment key={term.id}>
                <dt className='text-fg-muted truncate'>
                  {term.label}
                  {term.value !== undefined && ` (${term.value})`}
                </dt>
                <dd className='tabular-nums'>{Math.round(term.score * 100)}</dd>
              </Fragment>
            ))}
          </dl>
          {rating.missed.length > 0 && (
            <span className='text-sm text-fg-muted'>
              {t('missed.label', { requirements: rating.missed.join(', ') })}
            </span>
          )}
        </Layout.Flex>
      )}

      <Layout.Flex column gap='xs'>
        <Heading>{t('facts.label')}</Heading>
        <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm' data-testid='lighthouse.facts'>
          {facts.map((fact) => (
            <Fragment key={fact.key}>
              <dt className='text-fg-muted' title={fact.key}>
                {fact.label}
              </dt>
              <dd className='break-words'>{fact.values.slice(0, 6).join(', ')}</dd>
            </Fragment>
          ))}
        </dl>
      </Layout.Flex>

      <Layout.Flex column gap='xs'>
        <Heading>{t('provenance.label')}</Heading>
        {entity.provenance?.length ? (
          <Layout.Flex asChild column gap='xs'>
            <ul className='text-sm'>
              {entity.provenance.map((source, index) => (
                <li key={index} className='truncate'>
                  <span className='font-mono text-xs'>{source.extractor}</span>{' '}
                  {source.source && (
                    <Typography.Link href={source.source} target='_blank' rel='noreferrer'>
                      {source.source}
                    </Typography.Link>
                  )}{' '}
                  <span className='text-fg-subtle'>{source.at.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </Layout.Flex>
        ) : (
          <span className='text-sm text-fg-muted'>{t('provenance-unknown.message')}</span>
        )}
      </Layout.Flex>

      {read.map((extension) => {
        const node = extensionNodes[extension.id];
        const rows = extension.fields
          .map((field) => ({ field, values: node?.props[fieldPredicate(extension.id, field)] ?? [] }))
          .filter((row) => row.values.length > 0);
        return (
          <Layout.Flex key={extension.id} column gap='xs' data-testid={`lighthouse.extension.${extension.id}`}>
            <Layout.Grid cols={['fill', 'min', 'min']} gap='sm' align='center'>
              <Heading>{extension.label}</Heading>
              {onExtend && extension.research && !research[extension.id] ? (
                <Button.Root
                  variant='ghost'
                  iconOnly
                  icon={
                    busy[`${extension.id}:deep`] ? 'ph--circle-notch--regular' : 'ph--list-magnifying-glass--regular'
                  }
                  label={t('extension-research.label')}
                  disabled={busy[`${extension.id}:deep`]}
                  onClick={() => onExtend(extension.id, true)}
                  data-testid={`lighthouse.research-start.${extension.id}`}
                />
              ) : (
                <span />
              )}
              {onExtend && (
                <Button.Root
                  variant='ghost'
                  iconOnly
                  icon={busy[extension.id] ? 'ph--circle-notch--regular' : 'ph--arrow-clockwise--regular'}
                  label={t('extension-refresh.label')}
                  disabled={busy[extension.id]}
                  onClick={() => onExtend(extension.id, false)}
                />
              )}
            </Layout.Grid>
            {research[extension.id] && extension.research && (
              <ResearchItems extension={extension} research={research[extension.id]} />
            )}
            {rows.length ? (
              <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm'>
                {rows.map((row) => (
                  <Fragment key={row.field}>
                    <dt className='text-fg-muted'>{words(row.field)}</dt>
                    <dd className='whitespace-normal'>{row.values.slice(0, 10).map(String).join(', ')}</dd>
                  </Fragment>
                ))}
              </dl>
            ) : (
              !research[extension.id] && <span className='text-sm text-fg-muted'>{t('extension-empty.message')}</span>
            )}
          </Layout.Flex>
        );
      })}

      {unread.length > 0 && onExtend && (
        <Layout.Flex column gap='xs' data-testid='lighthouse.more'>
          <Heading>{t('more-about.label')}</Heading>
          {unread.map((extension) => (
            <Layout.Grid key={extension.id} cols={['fill', 'min', 'min']} gap='sm' align='center'>
              <span className='text-sm truncate' title={extension.description}>
                {extension.label}
              </span>
              <Button.Root
                variant='ghost'
                icon={busy[extension.id] ? 'ph--circle-notch--regular' : 'ph--plus--regular'}
                label={t('extension-read.label')}
                disabled={busy[extension.id]}
                onClick={() => onExtend(extension.id, false)}
                data-testid={`lighthouse.extend.${extension.id}`}
              />
              {extension.research ? (
                <Button.Root
                  variant='ghost'
                  icon={
                    busy[`${extension.id}:deep`] ? 'ph--circle-notch--regular' : 'ph--list-magnifying-glass--regular'
                  }
                  label={t('extension-research.label')}
                  disabled={busy[`${extension.id}:deep`]}
                  onClick={() => onExtend(extension.id, true)}
                  data-testid={`lighthouse.research-start.${extension.id}`}
                />
              ) : (
                <span />
              )}
            </Layout.Grid>
          ))}
        </Layout.Flex>
      )}
    </Layout.Flex>
  );
};
