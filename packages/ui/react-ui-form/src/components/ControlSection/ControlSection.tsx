//
// Copyright 2025 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type PropsWithChildren } from 'react';

import {
  Button,
  type ButtonProps,
  Input,
  type Label,
  type ThemedClassName,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

export type ControlPageProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

export const ControlPage = ({ children, classNames, ...props }: ControlPageProps) => {
  return (
    <div role='none' className={mx('pli-cardSpacingInline', classNames)} {...props}>
      {children}
    </div>
  );
};

export type ControlSectionProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

export const ControlSection = ({ title, description, children }: ControlSectionProps) => {
  return (
    <>
      <ControlSectionHeading title={title} description={description} />
      {children}
    </>
  );
};

export const ControlSectionHeading = ({ title, description }: Omit<ControlSectionProps, 'children'>) => {
  const { t } = useTranslation(translationKey);
  return (
    <>
      <h2 className='pli-trimMd container-max-width text-xl mbs-trimLg mbe-trimMd'>{toLocalizedString(title, t)}</h2>
      {description && (
        <p className='pli-trimMd mlb-trimMd container-max-width text-description'>
          {toLocalizedString(description, t)}
        </p>
      )}
    </>
  );
};

export const ControlGroupButton = ({ classNames, ...props }: ButtonProps) => {
  return <Button {...props} classNames={['md:col-span-2', classNames]} />;
};

export type ControlGroupProps = ThemedClassName<PropsWithChildren<{}>>;

export const ControlGroup = ({ children, classNames }: ControlGroupProps) => (
  <div
    role='none'
    className={mx('group container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content] gap-trimMd', classNames)}
  >
    {children}
  </div>
);

export const ControlFrame = ({ children }: ControlGroupProps) => (
  <div
    role='none'
    className='p-trimMd container-max-width grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-trimSm md:gap-trimMd border border-separator rounded-md'
  >
    {children}
  </div>
);

export type ControlItemProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

export const controlItemClasses =
  'pli-trimMd plb-trimMd container-max-width grid md:col-span-2 grid-cols-subgrid items-center gap-trimSm border border-separator rounded-md *:first:!mbs-0 *:last:!mbe-0';

const controlItemTitleClasses = 'text-lg font-normal';
const controlItemDescriptionClasses = 'text-base mlb-trimSm md:mbe-0 text-description';

export const ControlItem = ({ title, description, children }: ControlItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <div className={controlItemClasses}>
      <div role='none'>
        <h3 className={controlItemTitleClasses}>{toLocalizedString(title, t)}</h3>
        {description && <p className={controlItemDescriptionClasses}>{toLocalizedString(description, t)}</p>}
      </div>
      {children}
    </div>
  );
};

export const ControlItemInput = ({ title, description, children }: ControlItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <Input.Root>
      <div className={controlItemClasses}>
        <div role='none'>
          <Input.Label classNames={controlItemTitleClasses}>{toLocalizedString(title, t)}</Input.Label>
          {description && (
            <Input.DescriptionAndValidation>
              <Input.Description classNames={controlItemDescriptionClasses}>
                {toLocalizedString(description, t)}
              </Input.Description>
            </Input.DescriptionAndValidation>
          )}
        </div>
        {children}
      </div>
    </Input.Root>
  );
};

export const ControlFrameItem = ({ title, description, children }: ControlItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <div role='group' className='min-is-0'>
      <h3 className='text-lg mbe-2'>{toLocalizedString(title, t)}</h3>
      {description && <p className='mlb-trimSm md:mbe-0 text-description'>{toLocalizedString(description, t)}</p>}
      {children}
    </div>
  );
};
