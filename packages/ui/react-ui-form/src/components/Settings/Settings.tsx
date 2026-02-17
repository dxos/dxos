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
  title: 'mbe-0 text-lg text-baseText font-normal',
  description: 'mlb-trimSm md:mbe-0 text-base text-description',
};

//
// Root
//

type SettingsRootProps = PropsWithChildren;

const SettingsRoot = ({ children }: SettingsRootProps) => {
  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport classNames='p-trimMd'>{children}</ScrollArea.Viewport>
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
      <div className='is-full space-y-trimMd'>{children}</div>
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
      <h2 className='pli-trimMd container-max-width text-xl mbs-trimMd mbe-trimMd'>{toLocalizedString(title, t)}</h2>
      {description && (
        <p className='pli-trimMd mlb-trimMd container-max-width text-description'>
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
  <div
    role='none'
    className={mx(
      'group container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content] gap-trimMd',
      '[&_input]:justify-self-end [&_button]:justify-self-end',
      classNames,
    )}
  >
    {children}
  </div>
);

SettingsGroup.displayName = SETTINGS_GROUP_NAME;

//
// Frame
//

const SettingsFrame = ({ children }: SettingsGroupProps) => (
  <div
    role='none'
    className={mx(
      'container-max-width grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-trimSm md:gap-trimMd p-trimMd',
      'border border-separator rounded-md',
    )}
  >
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
    <div role='group' className='min-is-0'>
      <h3 className='text-lg mbe-2'>{toLocalizedString(title, t)}</h3>
      {description && <p className='mlb-trimSm md:mbe-0 text-description'>{toLocalizedString(description, t)}</p>}
      {children}
    </div>
  );
};

SettingsFrameItem.displayName = SETTINGS_FRAME_ITEM_NAME;

//
// Container
//

const SettingsContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      role='none'
      className={mx([
        'container-max-width grid md:col-span-2 grid-cols-subgrid gap-trimSm items-center',
        '*:first:!mbs-0 *:last:!mbe-0 pli-trimMd plb-trimMd',
        'border border-separator rounded-md',
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

const SettingsItem = ({ title, description, children }: SettingsItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <SettingsContainer>
      <div role='none'>
        <h3 className={styles.title}>{toLocalizedString(title, t)}</h3>
        {description && <p className={styles.description}>{toLocalizedString(description, t)}</p>}
      </div>
      {children}
    </SettingsContainer>
  );
};

SettingsItem.displayName = SETTINGS_ITEM_NAME;

//
// Item Input
//

const SettingsItemInput = ({ title, description, children }: SettingsItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <Input.Root>
      <SettingsContainer>
        <div role='none'>
          <Input.Label classNames={styles.title}>{toLocalizedString(title, t)}</Input.Label>
          {description && (
            <Input.DescriptionAndValidation>
              <Input.Description classNames={styles.description}>{toLocalizedString(description, t)}</Input.Description>
            </Input.DescriptionAndValidation>
          )}
        </div>
        {children}
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
