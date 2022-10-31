//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Planet } from 'phosphor-react';
import React from 'react';

import { Main, Heading, useTranslation, useId, Avatar, Tag, defaultHover } from '@dxos/react-uikit';

const Contact = ({ title, nSpaces, id }: { title: string; nSpaces: number; id: number }) => {
  const labelId = useId('appLabel');
  return (
    <div
      role='group'
      aria-labelledby={labelId}
      className={cx(
        'bg-white dark:bg-neutral-800 elevated-buttons shadow-sm',
        'rounded-md p-3 flex-none',
        'flex gap-2 items-center',
        defaultHover({}),
        'cursor-pointer'
      )}
    >
      <Avatar label={title} size={16} fallbackValue={id.toString(16)} />
      <Heading id={labelId} level={2} className='text-xl grow'>
        {title}
      </Heading>
      <Tag className='inline-flex gap-1 items-center'>
        <Planet />
        {nSpaces}
      </Tag>
    </div>
  );
};

const contactsSampleData = [
  {
    title: 'Amar Y',
    id: 1,
    nSpaces: 16
  },
  { title: 'Helena Bonaventure', id: 2, nSpaces: 7 },
  { title: 'Rudy Fell', id: 3, nSpaces: 2 }
];

export const ContactsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <Main>
      <Heading>{t('contacts label')}</Heading>
      <div role='none' className='flex flex-col gap-4'>
        {contactsSampleData.map((contact) => (
          <Contact key={contact.id} {...contact} />
        ))}
      </div>
    </Main>
  );
};
