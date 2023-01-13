//
// Copyright 2023 DXOS.org
//
import { Cancel } from '@radix-ui/react-alert-dialog';
import React, { ForwardedRef, forwardRef } from 'react';

import { Button, getSize, Heading, mx, Trans, useId, useTranslation } from '@dxos/react-components';

import { subduedSurface } from '../../styles';

export interface JoinSpaceHeadingProps {
  titleId: string;
  displayName: string;
  onClickExit?: () => void;
}

export const JoinSpaceHeading = forwardRef(
  ({ titleId, displayName, onClickExit }: JoinSpaceHeadingProps, ref: ForwardedRef<HTMLDivElement>) => {
    const { t } = useTranslation('os');
    const nameId = useId('spaceDisplayName');
    return (
      <div role='none' className={mx(subduedSurface, 'rounded-md')} ref={ref}>
        <div role='group' className='flex items-center gap-2'>
          <p role='img' className={mx(getSize(10), 'rounded-full bg-primary-500')} aria-labelledby={nameId} />
          <Heading level={1} className='font-body font-normal text-base' id={titleId}>
            <Trans
              {...{
                defaults: t('join space heading'),
                components: {
                  small: <span className='block font-body font-system-medium text-sm' />,
                  large: <span className='block' id={nameId} />
                },
                values: { displayName }
              }}
            />
          </Heading>
        </div>
        {onClickExit && (
          <Cancel asChild>
            <Button compact onClick={onClickExit} className='is-full mbs-2'>
              {t('exit label')}
            </Button>
          </Cancel>
        )}
      </div>
    );
  }
);
