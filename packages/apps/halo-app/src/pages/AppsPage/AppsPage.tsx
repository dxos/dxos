//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Planet } from 'phosphor-react';
import React from 'react';

import { Main, Heading, useTranslation, Avatar, Tag, useId, defaultDescription, defaultHover } from '@dxos/react-uikit';

const App = ({ title, description, nSpaces }: { title: string; description: string; nSpaces: number }) => {
  const labelId = useId('appLabel');
  return (
    <div
      role='group'
      aria-labelledby={labelId}
      className={cx(
        'bg-white dark:bg-neutral-800 elevated-buttons shadow-sm',
        'rounded-md p-3 w-48 flex-none',
        'flex flex-col gap-2 items-center',
        defaultHover({}),
        'cursor-pointer'
      )}
    >
      <Avatar label={title} size={20} fallbackValue={description} />
      <Heading id={labelId} level={2} className='text-xl'>
        {title}
      </Heading>
      <p className={cx('grow', defaultDescription)}>{description}</p>
      <Tag className='inline-flex gap-1 items-center'>
        <Planet />
        {nSpaces}
      </Tag>
    </div>
  );
};

const appsSampleData = [
  {
    title: 'Composer',
    id: 1,
    description: 'Collaborate on documents and include content from your other apps',
    nSpaces: 8
  },
  { title: 'Blend', id: 2, description: 'Distributed CGI collaboration', nSpaces: 2 },
  { title: 'Accord', id: 3, description: 'Decide together using real democratic methods', nSpaces: 6 }
];

export const AppsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <Main>
      <Heading>{t('apps label')}</Heading>
      <div role='none' className='flex flex-wrap gap-4'>
        {appsSampleData.map((app) => (
          <App key={app.id} {...app} />
        ))}
      </div>
    </Main>
  );
};
