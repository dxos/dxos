//
// Copyright 2023 DXOS.org
//

import React, { ComponentProps, ComponentPropsWithoutRef } from 'react';

import type { Profile } from '@dxos/client';
import { mx, useTranslation, Trans, Avatar, useId } from '@dxos/react-components';

import { defaultSurface, subduedSurface } from '../../../styles';
import { JoinDispatch } from '../JoinPanelProps';

export interface ViewStateProps extends ComponentProps<'div'> {
  active: boolean;
  dispatch: JoinDispatch;
  selectedIdentity?: Partial<Profile>;
}

export const ViewStateHeading = ({ children, className, ...props }: ComponentPropsWithoutRef<'h2'>) => {
  return (
    <h2 {...props} className={mx('font-system-medium text-sm md:text-base mbe-1 mli-1', className)}>
      {children}
    </h2>
  );
};

export const ViewState = ({ active, children, className, dispatch, selectedIdentity, ...props }: ViewStateProps) => {
  // note (thure): reserve `order-1` and `order-3` for outgoing steps in different directions
  const { t } = useTranslation('os');
  const identityLabel = useId('selectedIdentityLabel');

  return (
    <div
      role='none'
      {...props}
      {...(!active && { 'aria-hidden': true })}
      className={mx('is-[50%] flex flex-col', active ? 'order-2' : 'order-4', className)}
    >
      {selectedIdentity && (
        <div className={mx(subduedSurface, 'flex-none flex items-center gap-1 pli-2 pbe-1.5')}>
          <Trans
            {...{
              defaults: t('join space as identity heading'),
              components: {
                icon: (
                  <Avatar
                    size={4}
                    fallbackValue={selectedIdentity?.identityKey?.toHex() ?? ''}
                    labelId={identityLabel}
                  />
                ),
                label: <span id={identityLabel} />,
                part: <span role='none' className='flex items-center gap-1 leading-none' />
              },
              values: {
                labelValue: selectedIdentity.displayName ?? selectedIdentity.identityKey?.truncate() ?? ''
              }
            }}
          />
        </div>
      )}
      <div role='region' className={mx(defaultSurface, 'rounded-be-md grow shrink-0 flex flex-col gap-1 p-2')}>
        {children}
      </div>
    </div>
  );
};
