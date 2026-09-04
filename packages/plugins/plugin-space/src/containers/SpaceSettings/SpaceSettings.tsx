//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { IconButton, Input, Select, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { Settings } from '#types';

import { getSpaceDisplayName } from '../../util';

export type SpaceSettingsProps = {
  /** Section-level controls for the panel heading. */
  scope?: ReactNode;
  spaces?: Space[];
  onOpenSpaceSettings?: (space: Space) => void;
  settings?: Settings.Settings;
  onSettingsChange?: (updater: (prev: Settings.Settings) => Settings.Settings) => void;
  /** Id of the space currently designated as the default. */
  defaultSpaceId?: string;
  /** Spaces that may be designated as the default; defaults to all of `spaces`. */
  eligibleDefaultSpaces?: Space[];
  onDefaultSpaceChange?: (spaceId: string) => void;
};

export const SpaceSettings = ({
  spaces,
  onOpenSpaceSettings,
  settings,
  onSettingsChange,
  defaultSpaceId,
  eligibleDefaultSpaces = spaces,
  onDefaultSpaceChange,
  scope,
}: SpaceSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('plugin.name')} actions={scope}>
            <Form.Row label={t('settings.show-hidden.label')} description={t('settings.show-hidden.description')}>
              <Input.Root>
                <Input.Switch
                  disabled={!onSettingsChange}
                  checked={settings?.showHidden}
                  onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, showHidden: !!checked }))}
                />
              </Input.Root>
            </Form.Row>
          </Form.Section>
          <Form.Section title={t('space-settings.label')} description={t('space-settings.description')}>
            <Form.Row label={t('settings.default-space.label')} description={t('settings.default-space.description')}>
              <Select.Root
                value={defaultSpaceId}
                onValueChange={(value) => onDefaultSpaceChange?.(value)}
                disabled={!onDefaultSpaceChange}
              >
                <Select.TriggerButton placeholder={t('settings.default-space.placeholder')} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {eligibleDefaultSpaces?.map((space) => (
                        <Select.Option key={space.id} value={space.id}>
                          {toLocalizedString(getSpaceDisplayName(space), t)}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                    <Select.Arrow />
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </Form.Row>
            <Form.Row label={t('settings.space-list.label')} description={t('settings.space-list.description')}>
              <Listbox.Root>
                <Listbox.Content aria-label={t('settings.space-list.label')} classNames='w-full gap-trim-sm'>
                  {spaces?.map((space) => (
                    <Listbox.Item key={space.id} id={space.id} classNames='w-full gap-2 items-center'>
                      {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                      <Listbox.ItemLabel classNames='min-h-0!'>
                        {toLocalizedString(getSpaceDisplayName(space), t)}
                      </Listbox.ItemLabel>
                      <IconButton
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
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SpaceSettings.displayName = 'SpaceSettings';
