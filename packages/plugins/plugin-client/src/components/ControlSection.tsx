//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type Label, toLocalizedString, useTranslation, Input } from '@dxos/react-ui';

import { CLIENT_PLUGIN } from '../meta';

export type ControlSectionProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

export const ControlSection = ({ title, description, children }: ControlSectionProps) => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  return (
    <>
      <h2 className='pli-4 container-max-width text-xl mbs-6 mbe-4'>{toLocalizedString(title, t)}</h2>
      {description && (
        <p className='pli-4 mlb-4 container-max-width text-description'>{toLocalizedString(description, t)}</p>
      )}
      {children}
    </>
  );
};

export type ControlGroupProps = PropsWithChildren<{}>;

export const ControlGroup = ({ children }: ControlGroupProps) => (
  <div role='none' className='group container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content] gap-4'>
    {children}
  </div>
);

export const ControlFrame = ({ children }: ControlGroupProps) => (
  <div
    role='none'
    className='p-4 border border-separator rounded-lg container-max-width grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-2 md:gap-8'
  >
    {children}
  </div>
);

export type ControlItemProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

const controlItemClasses =
  'p-4 border border-separator rounded-lg container-max-width grid md:col-span-2 grid-cols-subgrid items-center';

const controlItemTitleClasses = 'text-lg mbe-2';

export const ControlItem = ({ title, description, children }: ControlItemProps) => {
  const { t } = useTranslation(CLIENT_PLUGIN);

  return (
    <div className={controlItemClasses}>
      <div role='none'>
        <h3 className={controlItemTitleClasses}>{toLocalizedString(title, t)}</h3>
        {description && <p className='mlb-2 md:mbe-0 text-description'>{toLocalizedString(description, t)}</p>}
      </div>
      {children}
    </div>
  );
};

export const ControlItemInput = ({ title, description, children }: ControlItemProps) => {
  const { t } = useTranslation(CLIENT_PLUGIN);

  return (
    <Input.Root>
      <div className={controlItemClasses}>
        <div role='none'>
          <Input.Label classNames={controlItemTitleClasses}>{toLocalizedString(title, t)}</Input.Label>
          {description && (
            <Input.DescriptionAndValidation>
              <Input.Description>{toLocalizedString(description, t)}</Input.Description>
            </Input.DescriptionAndValidation>
          )}
        </div>
        {children}
      </div>
    </Input.Root>
  );
};

export const ControlFrameItem = ({ title, description, children }: ControlItemProps) => {
  const { t } = useTranslation(CLIENT_PLUGIN);

  return (
    <div role='group' className='min-is-0'>
      <h3 className='text-lg mbe-2'>{toLocalizedString(title, t)}</h3>
      {description && <p className='mlb-2 md:mbe-0 text-description'>{toLocalizedString(description, t)}</p>}
      {children}
    </div>
  );
};
