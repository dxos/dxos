//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type Label, ScrollArea, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { composable, composableProps, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { SettingsFieldSet } from './SettingsFieldSet';
import { SettingsItem, SettingsPanel } from './SettingsItem';

const SETTINGS_ROOT_NAME = 'Settings.Root';
const SETTINGS_VIEWPORT_NAME = 'Settings.Viewport';
const SETTINGS_SECTION_NAME = 'Settings.Section';

//
// Root (headless — no styling, no scroll).
//

type SettingsRootProps = ThemedClassName<PropsWithChildren>;

const SettingsRoot = ({ children, classNames }: SettingsRootProps) => {
  return <div className={mx('flex flex-col gap-2', classNames)}>{children}</div>;
};

SettingsRoot.displayName = SETTINGS_ROOT_NAME;

//
// Viewport (scroll area + padding + document layout).
//

const SettingsViewport = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  return (
    <ScrollArea.Root {...composableProps(props)} orientation='vertical' centered thin ref={forwardedRef}>
      <ScrollArea.Viewport classNames='px-4 pointer-coarse:px-2'>
        <div role='none' className='dx-document flex flex-col gap-2 py-4'>
          {children}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

SettingsViewport.displayName = SETTINGS_VIEWPORT_NAME;

//
// Section (title + optional description + children with spacing).
//

type SettingsSectionProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

const SettingsSection = ({ title, description, children }: SettingsSectionProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <>
      <h2 className='px-trim-md mt-trim-md text-xl'>{toLocalizedString(title, t)}</h2>
      {description && <p className='px-trim-md text-description'>{toLocalizedString(description, t)}</p>}
      <div className='w-full pt-trim-md space-y-trim-md'>{children}</div>
    </>
  );
};

SettingsSection.displayName = SETTINGS_SECTION_NAME;

//
// Settings
//

export const Settings = {
  Root: SettingsRoot,
  Viewport: SettingsViewport,
  Section: SettingsSection,
  Panel: SettingsPanel,
  Item: SettingsItem,
  FieldSet: SettingsFieldSet,
};
