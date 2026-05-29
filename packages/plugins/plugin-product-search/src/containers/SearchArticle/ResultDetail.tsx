//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Result } from '../../types';

export type ResultDetailProps = {
  result?: Result.Result;
};

/** Detail pane for the selected search result. */
export const ResultDetail = ({ result }: ResultDetailProps) => {
  if (!result) {
    return <div className='flex items-center justify-center h-full text-subdued text-sm'>No result selected.</div>;
  }

  const properties = Object.entries(result.properties ?? {});

  return (
    <div className='flex flex-col gap-3 p-3 overflow-y-auto'>
      <h2 className='text-lg font-medium'>{result.title}</h2>

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
        <div className='flex flex-col gap-2'>
          {result.images.map((image, index) => (
            <img key={index} src={image} alt={result.title ?? 'Product'} className='w-full rounded-xs' />
          ))}
        </div>
      )}

      {properties.length > 0 && (
        <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm'>
          {properties.map(([key, value]) => (
            <React.Fragment key={key}>
              <dt className='text-description'>{key}</dt>
              <dd className='truncate'>{String(value)}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
};
