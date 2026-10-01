//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { useObject } from '@dxos/echo-react';
import { Flex, Grid, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { Result } from '#types';

export type ResultDetailProps = {
  result?: Result.Result;
  /** Star state and toggle owned by the Search container (the immutable Result has no `starred`). */
  starred?: boolean;
  onToggleStar?: () => void;
  onClose?: () => void;
};

/** Detail pane for the selected search result. */
export const ResultDetail = ({ result: subject, starred = false, onToggleStar, onClose }: ResultDetailProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Subscribe so the pane re-renders when the result loads.
  const [result] = useObject(subject);
  if (!result) {
    return <Next.Empty>{t('no-result-selected.message')}</Next.Empty>;
  }

  const properties = Object.entries(result.properties ?? {});

  return (
    <Flex column gap='md' classNames='p-3 overflow-y-auto'>
      <Grid cols={['minmax(0, 1fr)', 'min-content', 'min-content']} grow={false} gap='sm' align='start'>
        <h2 className='text-lg font-medium'>{result.title}</h2>
        <Next.SystemButton.Star iconOnly variant='ghost' active={starred} onClick={onToggleStar} />
        {onClose && (
          <Next.Button iconOnly variant='ghost' icon='ph--x--regular' label={t('close.label')} onClick={onClose} />
        )}
      </Grid>

      {result.price != null && (
        // Match ResultCard: currency-first, locale-grouped.
        <div className='text-sm text-description'>
          {[result.currency, result.price.toLocaleString()].filter(Boolean).join(' ')}
        </div>
      )}

      {result.url && (
        <a className='text-sm text-accent-text underline truncate' href={result.url} target='_blank' rel='noreferrer'>
          {result.url}
        </a>
      )}

      {result.images.length > 0 && (
        <Next.Carousel.Root count={result.images.length}>
          <Next.Carousel.PrevTrigger />
          <Next.Carousel.ItemGroup>
            {result.images.map((image, index) => (
              <Next.Carousel.Item key={index} index={index} src={image} alt={result.title ?? t('product.label')} />
            ))}
          </Next.Carousel.ItemGroup>
          <Next.Carousel.NextTrigger />
          <Next.Carousel.IndicatorGroup />
        </Next.Carousel.Root>
      )}

      {properties.length > 0 && (
        <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm'>
          {properties.map(([key, value]) => (
            <Fragment key={key}>
              <dt className='text-description'>{key}</dt>
              <dd className='truncate'>{String(value)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </Flex>
  );
};

ResultDetail.displayName = 'ResultDetail';
