//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useCapabilities } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Accordion } from '@dxos/react-ui-list';
import { StackItem } from '@dxos/react-ui-stack';

import { SpaceCapabilities } from '../../capabilities';
import { SPACE_PLUGIN } from '../../meta';

export const SPACE_SETTINGS_DIALOG = `${SPACE_PLUGIN}/SpaceSettingsDialog`;

export type SpaceSettingsTab = 'members' | 'settings';

export type SpaceSettingsContainerProps = {
  space: Space;
};

export const SpaceSettingsContainer = ({ space }: SpaceSettingsContainerProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const panels = useCapabilities(SpaceCapabilities.SettingsSection);
  const data = useMemo(() => ({ subject: space }), [space]);

  // TODO(wittjosiah): Accordion items should be open by default.
  // TODO(wittjosiah): Accordion open state should come from plugin state so that it can be preserved.
  return (
    <StackItem.Content classNames='plb-2 block overflow-y-auto'>
      <Accordion.Root<SpaceCapabilities.SettingsSection> items={panels}>
        {({ items }) => (
          <>
            {items.map((item) => (
              <Accordion.Item key={item.id} item={item} classNames='container-max-width'>
                <Accordion.ItemHeader title={toLocalizedString(item.label, t)} />
                <Accordion.ItemBody>
                  <Surface role={`space-settings--${item.id}`} data={data} />
                </Accordion.ItemBody>
              </Accordion.Item>
            ))}
          </>
        )}
      </Accordion.Root>
    </StackItem.Content>
  );
};
