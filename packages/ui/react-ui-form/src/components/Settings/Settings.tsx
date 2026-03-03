//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import {
  Button,
  type ButtonProps,
  Input,
  type Label,
  ScrollArea,
  type ThemedClassName,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';

const SETTINGS_ROOT_NAME = 'Settings.Root';
const SETTINGS_SECTION_NAME = 'Settings.Section';
const SETTINGS_SECTION_HEADING_NAME = 'Settings.SectionHeading';
const SETTINGS_GROUP_NAME = 'Settings.Group';
const SETTINGS_GROUP_BUTTON_NAME = 'Settings.GroupButton';
const SETTINGS_CONTAINER_NAME = 'Settings.Container';
const SETTINGS_FRAME_NAME = 'Settings.Frame';
const SETTINGS_FRAME_ITEM_NAME = 'Settings.FrameItem';
const SETTINGS_ITEM_NAME = 'Settings.Item';
const SETTINGS_ITEM_INPUT_NAME = 'Settings.ItemInput';

const styles = {
  title: 'pb-trim-md text-base-surface-text text-lg',
  description: 'text-base text-description',
  grid: 'grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-x-trim-lg',
};

//
// Root
//

type SettingsRootProps = PropsWithChildren;

const SettingsRoot = ({ children }: SettingsRootProps) => {
  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport classNames='p-trim-md'>{children}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

SettingsRoot.displayName = SETTINGS_ROOT_NAME;

//
// Section
//

type SettingsSectionProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

const SettingsSection = ({ title, description, children }: SettingsSectionProps) => {
  return (
    <>
      <SettingsSectionHeading title={title} description={description} />
      <div className='w-full pt-trim-md space-y-trim-md'>{children}</div>
    </>
  );
};

SettingsSection.displayName = SETTINGS_SECTION_NAME;

//
// Section Heading
//

const SettingsSectionHeading = ({ title, description }: Omit<SettingsSectionProps, 'children'>) => {
  const { t } = useTranslation(translationKey);
  return (
    <>
      <h2 className='px-trim-md mt-trim-md mb-trim-md dx-container-max-width text-xl'>{toLocalizedString(title, t)}</h2>
      {description && (
        <p className='px-trim-md my-trim-md dx-container-max-width text-description'>
          {toLocalizedString(description, t)}
        </p>
      )}
    </>
  );
};

SettingsSectionHeading.displayName = SETTINGS_SECTION_HEADING_NAME;

//
// Group Button
//

const SettingsGroupButton = ({ classNames, ...props }: ButtonProps) => {
  return <Button {...props} classNames={['md:col-span-2', classNames]} />;
};

SettingsGroupButton.displayName = SETTINGS_GROUP_BUTTON_NAME;

//
// Group
//

type SettingsGroupProps = ThemedClassName<PropsWithChildren>;

const SettingsGroup = ({ children, classNames }: SettingsGroupProps) => (
  <div role='none' className={mx('group dx-container-max-width space-y-trim-md', classNames)}>
    {children}
  </div>
);

SettingsGroup.displayName = SETTINGS_GROUP_NAME;

//
// Frame
//

const SettingsFrame = ({ children }: SettingsGroupProps) => (
  <div role='none' className={mx('dx-container-max-width p-trim-md', 'border border-separator rounded-md')}>
    {children}
  </div>
);

SettingsFrame.displayName = SETTINGS_FRAME_NAME;

//
// Frame Item
//

const SettingsFrameItem = ({ title, description, children }: SettingsItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <div role='group' className='min-w-0'>
      <h3 className='text-lg mb-2'>{toLocalizedString(title, t)}</h3>
      {description && <p className='my-trim-sm md:mb-0 text-description'>{toLocalizedString(description, t)}</p>}
      {children}
    </div>
  );
};

SettingsFrameItem.displayName = SETTINGS_FRAME_ITEM_NAME;

//
// Container
//

const SettingsContainer = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div
      role='none'
      className={mx([
        'dx-container-max-width',
        '*:first:!mt-0 *:last:!mb-0 px-trim-md py-trim-md',
        'border border-separator rounded-md',
        classNames,
      ])}
    >
      {children}
    </div>
  );
};

SettingsContainer.displayName = SETTINGS_CONTAINER_NAME;

//
// Item
//

type SettingsItemProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

const SettingsItem = ({ title, description = '', children }: SettingsItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <SettingsContainer classNames={styles.grid}>
      <h3 className={mx(styles.title, 'md:col-span-2')}>{toLocalizedString(title, t)}</h3>
      <p className={styles.description}>{toLocalizedString(description, t)}</p>
      <div role='none' className='overflow-hidden text-end py-1'>
        {children}
      </div>
    </SettingsContainer>
  );
};

SettingsItem.displayName = SETTINGS_ITEM_NAME;

//
// Item Input
//

const SettingsItemInput = ({ title, description = '', children }: SettingsItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <Input.Root>
      <SettingsContainer classNames={styles.grid}>
        <Input.Label classNames={mx(styles.title, 'md:col-span-2')}>{toLocalizedString(title, t)}</Input.Label>
        <Input.DescriptionAndValidation>
          <Input.Description classNames={styles.description}>{toLocalizedString(description, t)}</Input.Description>
        </Input.DescriptionAndValidation>
        <div role='none' className='text-end py-1'>
          {children}
        </div>
      </SettingsContainer>
    </Input.Root>
  );
};

SettingsItemInput.displayName = SETTINGS_ITEM_INPUT_NAME;

//
// Settings
//

export const Settings = {
  Root: SettingsRoot,
  Section: SettingsSection,
  SectionHeading: SettingsSectionHeading,
  Group: SettingsGroup,
  GroupButton: SettingsGroupButton,
  Container: SettingsContainer,
  Frame: SettingsFrame,
  FrameItem: SettingsFrameItem,
  Item: SettingsItem,
  ItemInput: SettingsItemInput,
};
