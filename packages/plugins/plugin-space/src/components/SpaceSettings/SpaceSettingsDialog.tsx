//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';
import { Button, Dialog, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tabs, type TabsRootProps, type TabsActivePart } from '@dxos/react-ui-tabs';
import { ClipboardProvider, SpacePanel, type SpacePanelProps } from '@dxos/shell/react';

import { SpaceSettingsPanel, type SpaceSettingsPanelProps } from './SpaceSettingsPanel';
import { SPACE_PLUGIN } from '../../meta';
import { COMPOSER_SPACE_LOCK, getSpaceDisplayName } from '../../util';

export type SpaceSettingsTab = 'members' | 'settings';

export type SpaceSettingsDialogProps = {
  initialTab?: SpaceSettingsTab;
  namesCache?: Record<string, string>;
} & SpaceSettingsPanelProps &
  Pick<SpacePanelProps, 'createInvitationUrl' | 'target'>;

export const SpaceSettingsDialog = ({
  space,
  target,
  createInvitationUrl,
  initialTab = 'members',
  namesCache,
}: SpaceSettingsDialogProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const [tabsActivePart, setTabsActivePart] = useState<TabsActivePart>('list');
  const [selected, setSelected] = useState<SpaceSettingsTab>(initialTab);
  const locked = space.properties[COMPOSER_SPACE_LOCK];
  const name = getSpaceDisplayName(space, { personal: client.spaces.default === space, namesCache });

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames='p-0 bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <div role='none' className='flex justify-between pbs-3 pis-2 pie-3 @md:pbs-4 @md:pis-4 @md:pie-5'>
        <Dialog.Title
          onClick={() => setTabsActivePart('list')}
          aria-description={t('click to return to tablist description')}
          classNames='flex cursor-pointer items-center group/title'
        >
          <Icon
            icon='ph--caret-left--regular'
            size={4}
            classNames={['@md:hidden', tabsActivePart === 'list' && 'invisible']}
          />
          <span
            className={
              tabsActivePart !== 'list'
                ? 'group-hover/title:underline @md:group-hover/title:no-underline underline-offset-4 decoration-1'
                : ''
            }
          >
            {toLocalizedString(name, t)}
          </span>
        </Dialog.Title>
        <Dialog.Close asChild>
          <Button density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={3} />
          </Button>
        </Dialog.Close>
      </div>
      <Tabs.Root
        orientation='vertical'
        value={selected}
        onValueChange={setSelected as TabsRootProps['onValueChange']}
        activePart={tabsActivePart}
        onActivePartChange={setTabsActivePart}
        classNames='flex flex-col flex-1 mbs-2'
      >
        <Tabs.Viewport classNames='flex-1 min-bs-0'>
          <div role='none' className='overflow-y-auto pli-3 @md:pis-2 @md:pie-0 mbe-4 border-r border-separator'>
            <Tabs.Tablist classNames='flex flex-col max-bs-none min-is-[200px] gap-4 overflow-y-auto'>
              <div role='none' className='flex flex-col ml-1'>
                <Tabs.Tab value='settings'>{t('settings tab label')}</Tabs.Tab>
                <Tabs.Tab value='members' disabled={locked}>
                  {t('members tab label')}
                </Tabs.Tab>
              </div>
            </Tabs.Tablist>
          </div>

          <Tabs.Tabpanel value='settings' classNames='pli-3 @md:pli-5 max-bs-dvh overflow-y-auto'>
            <SpaceSettingsPanel space={space} />
          </Tabs.Tabpanel>

          {/* TODO(wittjosiah): Weird focus ring when tabpanel is focused. */}
          <Tabs.Tabpanel value='members' classNames='pli-3 @md:pli-5 max-bs-dvh overflow-y-auto'>
            <ClipboardProvider>
              <SpacePanel space={space} hideHeading target={target} createInvitationUrl={createInvitationUrl} />
            </ClipboardProvider>
          </Tabs.Tabpanel>
        </Tabs.Viewport>
      </Tabs.Root>
    </Dialog.Content>
  );
};
