//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Select from '@dxos/react-ui/Select';
import * as Switch from '@dxos/react-ui/Switch';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';
import { Settings } from '#types';

import { getSpaceDisplayName } from '../../util/index.ts';

export type SpaceSettingsProps = {
  spaces?: Space[];
  onOpenSpaceSettings?: (space: Space) => void;
  settings?: Settings.Settings;
  onSettingsChange?: (updater: (prev: Settings.Settings) => Settings.Settings) => void;
  /** Id of the space currently designated as the default. */
  defaultSpaceId?: string;
  /** Spaces that may be designated as the default; defaults to all of `spaces`. */
  eligibleDefaultSpaces?: Space[];
  onDefaultSpaceChange?: (spaceId: string) => void;
  /** Controls for the panel's heading row. */
  scope?: ReactNode;
};

export const SpaceSettings = ({
  scope,
  spaces,
  onOpenSpaceSettings,
  settings,
  onSettingsChange,
  defaultSpaceId,
  eligibleDefaultSpaces = spaces,
  onDefaultSpaceChange,
}: SpaceSettingsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('plugin.name')} actions={scope}>
            <Form.Field label={t('settings.show-hidden.label')} description={t('settings.show-hidden.description')}>
              <Switch.Switch
                disabled={!onSettingsChange}
                checked={settings?.showHidden}
                onCheckedChange={({ checked }) => onSettingsChange?.((s) => ({ ...s, showHidden: !!checked }))}
              />
            </Form.Field>
          </Form.FieldSet>
          <Form.FieldSet label={t('space-settings.label')} description={t('space-settings.description')}>
            <Form.Field label={t('settings.default-space.label')} description={t('settings.default-space.description')}>
              <Select.Root
                value={defaultSpaceId ? [defaultSpaceId] : []}
                onValueChange={({ value: [value] }) => value && onDefaultSpaceChange?.(value)}
                disabled={!onDefaultSpaceChange}
                items={(eligibleDefaultSpaces ?? []).map((space) => ({
                  value: space.id,
                  label: ThemeProvider.toLocalizedString(getSpaceDisplayName(space), t),
                }))}
              >
                <Select.Trigger placeholder={t('settings.default-space.placeholder')} />
                <Select.Content>
                  {eligibleDefaultSpaces?.map((space) => (
                    <Select.Item
                      key={space.id}
                      item={{ value: space.id, label: ThemeProvider.toLocalizedString(getSpaceDisplayName(space), t) }}
                    />
                  ))}
                </Select.Content>
              </Select.Root>
            </Form.Field>
            <Form.Field
              standalone
              label={t('settings.space-list.label')}
              description={t('settings.space-list.description')}
            >
              <Listbox.Root
                items={(spaces ?? []).map((space) => ({
                  value: space.id,
                  label: ThemeProvider.toLocalizedString(getSpaceDisplayName(space), t),
                }))}
              >
                <Listbox.Content aria-label={t('settings.space-list.label')} classNames='w-full gap-trim-sm'>
                  {spaces?.map((space) => (
                    <Listbox.Item key={space.id} id={space.id} classNames='w-full gap-2 items-center'>
                      {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                      <Listbox.ItemText classNames='min-h-0!'>
                        {ThemeProvider.toLocalizedString(getSpaceDisplayName(space), t)}
                      </Listbox.ItemText>
                      <Button.Button
                        icon='ph--faders--regular'
                        iconOnly
                        label={t('settings.open-settings.label')}
                        disabled={!onOpenSpaceSettings}
                        onClick={() => onOpenSpaceSettings?.(space)}
                      />
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Listbox.Root>
            </Form.Field>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SpaceSettings.displayName = 'SpaceSettings';
