//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { useObject } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Carousel from '@dxos/react-ui/Carousel';
import * as Empty from '@dxos/react-ui/Empty';
import * as Flex from '@dxos/react-ui/Flex';
import * as Grid from '@dxos/react-ui/Grid';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';

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
  const { t } = Hooks.useTranslation(meta.profile.key);
  // Subscribe so the pane re-renders when the result loads.
  const [result] = useObject(subject);
  if (!result) {
    return <Empty.Empty>{t('no-result-selected.message')}</Empty.Empty>;
  }

  const properties = Object.entries(result.properties ?? {});

  return (
    <Flex.Flex column gap='md' classNames='p-3 overflow-y-auto'>
      <Grid.Grid cols={['minmax(0, 1fr)', 'min-content', 'min-content']} grow={false} gap='sm' align='start'>
        <h2 className='text-lg font-medium'>{result.title}</h2>
        <SystemButton.Star iconOnly variant='ghost' pressed={starred} onClick={onToggleStar} />
        {onClose && (
          <Button.Button iconOnly variant='ghost' icon='ph--x--regular' label={t('close.label')} onClick={onClose} />
        )}
      </Grid.Grid>

      {result.price != null && (
        // Match ResultCard: currency-first, locale-grouped.
        <div className='text-sm text-fg-muted'>
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
          <Carousel.PrevTrigger />
          <Carousel.ItemGroup>
            {result.images.map((image, index) => (
              <Carousel.Item key={index} index={index} src={image} alt={result.title ?? t('product.label')} />
            ))}
          </Carousel.ItemGroup>
          <Carousel.NextTrigger />
          <Carousel.IndicatorGroup />
        </Carousel.Root>
      )}

      {properties.length > 0 && (
        <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm'>
          {properties.map(([key, value]) => (
            <Fragment key={key}>
              <dt className='text-fg-muted'>{key}</dt>
              <dd className='truncate'>{String(value)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </Flex.Flex>
  );
};

ResultDetail.displayName = 'ResultDetail';
