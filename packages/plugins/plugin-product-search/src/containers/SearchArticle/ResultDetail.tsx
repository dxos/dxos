//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Carousel, IconButton } from '@dxos/react-ui';

import { type Result } from '../../types';

export type ResultDetailProps = {
  result?: Result.Result;
  onClose?: () => void;
};

/** Detail pane for the selected search result. */
export const ResultDetail = ({ result, onClose }: ResultDetailProps) => {
  const handleToggleStar = useCallback(() => {
    if (result) {
      Obj.update(result, (result) => {
        result.starred = !result.starred;
      });
    }
  }, [result]);

  if (!result) {
    return <div className='flex items-center justify-center h-full text-subdued text-sm'>No result selected.</div>;
  }

  const properties = Object.entries(result.properties ?? {});
  const starred = Boolean(result.starred);

  return (
    <div className='flex flex-col gap-3 p-3 overflow-y-auto'>
      <div className='grid grid-cols-[minmax(0,1fr)_min-content_min-content] items-start gap-2'>
        <h2 className='text-lg font-medium'>{result.title}</h2>
        <IconButton
          iconOnly
          variant='ghost'
          icon={starred ? 'ph--star--fill' : 'ph--star--regular'}
          label={starred ? 'Unstar' : 'Star'}
          onClick={handleToggleStar}
        />
        {onClose && <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Close' onClick={onClose} />}
      </div>

      {(result.price != null || result.currency) && (
        <div className='text-sm text-description'>
          {result.price != null ? result.price : ''}
          {result.currency ? ` ${result.currency}` : ''}
        </div>
      )}

      {result.url && (
        <a className='text-sm text-accent-text underline truncate' href={result.url} target='_blank' rel='noreferrer'>
          {result.url}
        </a>
      )}

      {result.images.length > 0 && (
        <Carousel.Root count={result.images.length} classNames='rounded-xs overflow-hidden'>
          <Carousel.Previous />
          <Carousel.Viewport>
            {result.images.map((image, index) => (
              <Carousel.Slide key={index} index={index} src={image} alt={result.title ?? 'Product'} />
            ))}
          </Carousel.Viewport>
          <Carousel.Next />
          <Carousel.Indicators />
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
