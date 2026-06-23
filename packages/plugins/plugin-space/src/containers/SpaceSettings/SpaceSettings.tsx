//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AppSpace } from '@dxos/app-toolkit';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, Input, List, ListItem, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { getSpaceDisplayName } from '../../util';

export type SpaceSettingsProps = {
  spaces?: Space[];
  onOpenSpaceSettings?: (space: Space) => void;
};

export const SpaceSettings = ({ spaces, onOpenSpaceSettings }: SpaceSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('space-settings.label')} description={t('space-settings.description')}>
            <Form.Row
              label={t('settings.space-list.label')}
              description=' asdjlkfja sdlfkjas dlfkja sdlfkaj sdlfkajs dflkajsd flaksjd flaskdjf alskdfj asldkj'
            >
              <List classNames='flex flex-col w-full gap-trim-sm'>
                {spaces?.map((space) => (
                  <ListItem.Root key={space.id} classNames='w-full items-center'>
                    {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                    <ListItem.Heading classNames='grow truncate min-h-0!'>
                      {toLocalizedString(
                        getSpaceDisplayName(space, {
                          personal: AppSpace.isPersonalSpace(space),
                        }),
                        t,
                      )}
                    </ListItem.Heading>
                    <IconButton
                      icon='ph--faders--regular'
                      iconOnly
                      label={t('settings.open-settings.label')}
                      disabled={!onOpenSpaceSettings}
                      onClick={() => onOpenSpaceSettings?.(space)}
                    />
                  </ListItem.Root>
                ))}
              </List>
            </Form.Row>
            <Input.Root>
              <Input.Label>{t('settings.space-list.label')}</Input.Label>
            </Input.Root>
            <List classNames='flex flex-col gap-trim-sm'>
              {spaces?.map((space) => (
                <ListItem.Root key={space.id} classNames='w-full items-center'>
                  {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                  <ListItem.Heading classNames='grow truncate min-h-0!'>
                    {toLocalizedString(
                      getSpaceDisplayName(space, {
                        personal: AppSpace.isPersonalSpace(space),
                      }),
                      t,
                    )}
                  </ListItem.Heading>
                  <IconButton
                    icon='ph--faders--regular'
                    iconOnly
                    label={t('settings.open-settings.label')}
                    disabled={!onOpenSpaceSettings}
                    onClick={() => onOpenSpaceSettings?.(space)}
                  />
                </ListItem.Root>
              ))}
            </List>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
