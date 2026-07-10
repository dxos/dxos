//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { useObject } from '@dxos/react-client/echo';
import { Carousel, IconButton, SystemIconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { type Result } from '../../types';

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
    return (
      <div className='flex items-center justify-center h-full text-subdued text-sm'>
        {t('no-result-selected.message')}
      </div>
    );
  }

  const properties = Object.entries(result.properties ?? {});

  return (
    <div className='flex flex-col gap-3 p-3 overflow-y-auto'>
      <div className='grid grid-cols-[minmax(0,1fr)_min-content_min-content] gap-2 items-start'>
        <h2 className='text-lg font-medium'>{result.title}</h2>
        <SystemIconButton.Star iconOnly variant='ghost' active={starred} onClick={onToggleStar} />
        {onClose && (
          <IconButton iconOnly variant='ghost' icon='ph--x--regular' label={t('close.label')} onClick={onClose} />
        )}
      </div>

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
        <Carousel.Root count={result.images.length}>
          <Carousel.Content classNames='rounded-xs overflow-hidden'>
            <Carousel.Previous />
            <Carousel.Viewport>
              {result.images.map((image, index) => (
                <Carousel.Slide key={index} index={index} src={image} alt={result.title ?? t('product.label')} />
              ))}
            </Carousel.Viewport>
            <Carousel.Next />
            <Carousel.Indicators />
          </Carousel.Content>
        </Carousel.Root>
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
    </div>
  );
};

ResultDetail.displayName = 'ResultDetail';
