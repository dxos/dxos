//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { Card, cardNoSpacing, cardSpacing } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { type PreviewProps } from '../types';

import { CardSubjectMenu } from './CardSubjectMenu';

export const gridRow = 'is-full grid grid-cols-[1.5rem_1fr_min-content] gap-2 items-center';

export const GridHeader = ({ label, subject, activeSpace }: { label?: string } & PreviewProps) => {
  return (
    <div role='none' className={mx('flex items-center gap-2', cardSpacing)}>
      <Card.Heading classNames={cardNoSpacing}>{label}</Card.Heading>
      <CardSubjectMenu subject={subject} activeSpace={activeSpace} />
    </div>
  );
};

export const GridRow = ({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) => {
  if (!onClick) {
    return (
      <p data-variant='ghost' className={mx(gridRow, 'dx-button')}>
        <Icon icon={icon} size={5} classNames='text-subdued' />
        <span className='min-is-0 flex-1 truncate col-span-2'>{label}</span>
      </p>
    );
  }

  return (
    <Button variant='ghost' classNames={mx(gridRow, 'text-start')} onClick={onClick}>
      <Icon icon={icon} size={5} classNames='text-subdued' />
      <span className='min-is-0 flex-1 truncate'>{label}</span>
      <Icon icon='ph--arrow-right--regular' />
    </Button>
  );
};

export const GridLink = ({ label, href }: { label: string; href: string }) => {
  return (
    <a
      className={mx(gridRow, 'dx-button dx-focus-ring')}
      data-variant='ghost'
      href={href}
      target='_blank'
      rel='noreferrer'
    >
      <Icon icon='ph--link--regular' size={5} classNames='text-subdued' />
      <span className='min-is-0 flex-1 truncate'>{label}</span>
      <Icon icon='ph--arrow-square-out--regular' />
    </a>
  );
};
