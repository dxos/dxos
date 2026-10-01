//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form/next';
import { Listbox } from '@dxos/react-ui-list/next';
import { Next } from '@dxos/react-ui/next';

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
  const { t } = useTranslation(meta.profile.key);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('plugin.name')} actions={scope}>
            <Form.Field label={t('settings.show-hidden.label')} description={t('settings.show-hidden.description')}>
              <Next.Switch
                disabled={!onSettingsChange}
                checked={settings?.showHidden}
                onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, showHidden: !!checked }))}
              />
            </Form.Field>
          </Form.FieldSet>
          <Form.FieldSet label={t('space-settings.label')} description={t('space-settings.description')}>
            <Form.Field label={t('settings.default-space.label')} description={t('settings.default-space.description')}>
              <Next.Select.Root
                value={[defaultSpaceId]}
                onValueChange={({ value: [value] }) => onDefaultSpaceChange?.(value)}
                disabled={!onDefaultSpaceChange}
                items={eligibleDefaultSpaces.map((space) => ({
                  value: space.id,
                  label: toLocalizedString(getSpaceDisplayName(space), t),
                }))}
              >
                <Next.Select.Trigger placeholder={t('settings.default-space.placeholder')} />
                <Next.Select.Content>
                  {eligibleDefaultSpaces?.map((space) => (
                    <Next.Select.Item
                      key={space.id}
                      item={{ value: space.id, label: toLocalizedString(getSpaceDisplayName(space), t) }}
                    />
                  ))}
                </Next.Select.Content>
              </Next.Select.Root>
            </Form.Field>
            <Form.Field
              standalone
              label={t('settings.space-list.label')}
              description={t('settings.space-list.description')}
            >
              <Listbox.Root
                items={spaces.map((space) => ({
                  value: space.id,
                  label: toLocalizedString(getSpaceDisplayName(space), t),
                }))}
              >
                <Listbox.Content aria-label={t('settings.space-list.label')} classNames='w-full gap-trim-sm'>
                  {spaces?.map((space) => (
                    <Listbox.Item key={space.id} id={space.id} classNames='w-full gap-2 items-center'>
                      {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                      <Listbox.ItemText classNames='min-h-0!'>
                        {toLocalizedString(getSpaceDisplayName(space), t)}
                      </Listbox.ItemText>
                      <Next.Button
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
