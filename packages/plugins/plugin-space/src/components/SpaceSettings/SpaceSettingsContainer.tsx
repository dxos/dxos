//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useCapabilities, useCapability } from '@dxos/app-framework';
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
  const state = useCapability(SpaceCapabilities.MutableState);
  const items = useCapabilities(SpaceCapabilities.SettingsSection);
  const data = useMemo(() => ({ subject: space }), [space]);

  const handleOpenSectionChange = useCallback(
    (sections: string[]) => {
      state.spaceSettingsOpenSections.splice(0, state.spaceSettingsOpenSections.length, ...sections);
    },
    [state],
  );

  return (
    <StackItem.Content classNames='plb-2 block overflow-y-auto'>
      <Accordion.Root<SpaceCapabilities.SettingsSection>
        items={items}
        value={state.spaceSettingsOpenSections}
        onValueChange={handleOpenSectionChange}
      >
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
