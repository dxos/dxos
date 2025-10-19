//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import {
  type DeckSettingsProps,
  type NewPlankPositioning,
  NewPlankPositions,
  type Overscroll,
  OverscrollOptions,
} from '../../types';

const isSocket = !!(globalThis as any).__args;

export const DeckSettings = ({ settings }: { settings: DeckSettingsProps }) => {
  const { t } = useTranslation(meta.id);

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <ControlGroup>
          <ControlItemInput title={t('settings enable deck label')}>
            <Input.Switch
              checked={settings.enableDeck}
              onCheckedChange={(checked) => (settings.enableDeck = checked)}
            />
          </ControlItemInput>
          <ControlItemInput title={t('settings encapsulated planks label')}>
            <Input.Switch
              checked={settings.encapsulatedPlanks ?? false}
              onCheckedChange={(checked) => (settings.encapsulatedPlanks = checked)}
            />
          </ControlItemInput>
          <ControlItemInput title={t('select new plank positioning label')}>
            <Select.Root
              disabled={!settings.enableDeck}
              value={settings.newPlankPositioning ?? 'start'}
              onValueChange={(value) => (settings.newPlankPositioning = value as NewPlankPositioning)}
            >
              <Select.TriggerButton placeholder={t('select new plank positioning placeholder')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {NewPlankPositions.map((position) => (
                      <Select.Option key={position} value={position}>
                        {t(`settings new plank position ${position} label`)}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </ControlItemInput>
          <ControlItemInput title={t('settings overscroll label')}>
            <Select.Root
              disabled={!settings.enableDeck}
              value={settings.overscroll ?? 'none'}
              onValueChange={(value) => (settings.overscroll = value as Overscroll)}
            >
              <Select.TriggerButton placeholder={t('select overscroll placeholder')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {OverscrollOptions.map((option) => (
                      <Select.Option key={option} value={option}>
                        {t(`settings overscroll ${option} label`)}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </ControlItemInput>
          <ControlItemInput title={t('settings enable statusbar label')}>
            <Input.Switch
              checked={settings.enableStatusbar}
              onCheckedChange={(checked) => (settings.enableStatusbar = checked)}
            />
          </ControlItemInput>
          <ControlItemInput title={t('settings show hints label')}>
            <Input.Switch checked={settings.showHints} onCheckedChange={(checked) => (settings.showHints = checked)} />
          </ControlItemInput>
          {!isSocket && (
            <ControlItemInput title={t('settings native redirect label')}>
              <Input.Switch
                checked={settings.enableNativeRedirect}
                onCheckedChange={(checked) => (settings.enableNativeRedirect = checked)}
              />
            </ControlItemInput>
          )}
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
