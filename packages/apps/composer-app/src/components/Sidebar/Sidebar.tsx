//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft, GearSix, Intersect, Planet, Sidebar } from '@phosphor-icons/react';
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Tooltip } from '@dxos/react-appkit';
import { observer, ShellLayout, useClient, useIdentity, useSpaces } from '@dxos/react-client';
import {
  Avatar,
  Button,
  DensityProvider,
  Dialog,
  ElevationProvider,
  getSize,
  Input,
  mx,
  ThemeContext,
  TreeRoot,
  useId,
  useTranslation
} from '@dxos/react-components';
import { PanelSidebarContext, useShell } from '@dxos/react-ui';

import { ComposerDocument } from '../../proto';
import { getPath } from '../../router';
import { useOctokitContext } from '../OctokitProvider';
import { Separator } from '../Separator';
import { SpaceTreeItem } from './SpaceTreeItem';

const DocumentTree = observer(() => {
  // TODO(wittjosiah): Fetch all spaces and render pending spaces differently.
  const spaces = useSpaces();
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation('composer');
  const identity = useIdentity();
  return (
    <div className='grow plb-1.5 pis-1 pie-1.5 min-bs-0 overflow-y-auto'>
      <span className='sr-only' id={treeLabel}>
        {t('sidebar tree label')}
      </span>
      <TreeRoot labelId={treeLabel} data-testid='composer.sidebarTree'>
        {spaces
          .filter((space) => !identity || space.properties.members?.[identity.identityKey.toHex()]?.hidden !== true)
          .map((space) => {
            return <SpaceTreeItem key={space.key.toHex()} space={space} />;
          })}
      </TreeRoot>
    </div>
  );
});

const SidebarContent = () => {
  const client = useClient();
  const shell = useShell();
  const navigate = useNavigate();
  const { t } = useTranslation('composer');
  const { displayState, setDisplayState } = useContext(PanelSidebarContext);
  const identity = useIdentity();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const { pat, setPat } = useOctokitContext();
  const [patValue, setPatValue] = useState(pat);

  useEffect(() => {
    setPatValue(pat);
  }, [pat]);

  const handleCreateSpace = async () => {
    const space = await client.createSpace();
    const document = await space.db.add(new ComposerDocument());
    return navigate(getPath(space.key, document.id));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE);
  };

  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <ElevationProvider elevation='chrome'>
        <DensityProvider density='fine'>
          <Dialog
            title={t('profile settings label')}
            open={settingsDialogOpen}
            onOpenChange={(nextOpen) => {
              setSettingsDialogOpen(nextOpen);
              if (!nextOpen) {
                void setPat(patValue);
              }
            }}
            slots={{ overlay: { className: 'z-40 backdrop-blur' } }}
            closeTriggers={[
              <Button key='a1' variant='primary' data-testid='composer.closeUserSettingsDialog'>
                {t('done label', { ns: 'os' })}
              </Button>
            ]}
          >
            <Input
              label={t('github pat label')}
              value={patValue}
              data-testid='composer.githubPat'
              onChange={({ target: { value } }) => setPatValue(value)}
              slots={{
                root: { className: 'mlb-2' },
                input: { autoFocus: true, spellCheck: false, className: 'font-mono' }
              }}
            />
          </Dialog>
          <div role='none' className='flex flex-col bs-full'>
            <div role='none' className='shrink-0 flex items-center pli-1.5 plb-1.5'>
              <h1 className={mx('grow font-system-medium text-lg pli-1.5')}>{t('current app name')}</h1>
              <Tooltip
                content={t('create space label', { ns: 'appkit' })}
                zIndex='z-[31]'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button
                  variant='ghost'
                  data-testid='composer.createSpace'
                  onClick={handleCreateSpace}
                  className='pli-1'
                >
                  <Planet className={getSize(4)} />
                </Button>
              </Tooltip>
              <Tooltip
                content={t('join space label', { ns: 'appkit' })}
                zIndex='z-[31]'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button variant='ghost' data-testid='composer.joinSpace' onClick={handleJoinSpace} className='pli-1'>
                  <Intersect className={getSize(4)} />
                </Button>
              </Tooltip>
              <Tooltip
                content={t('close sidebar label', { ns: 'os' })}
                zIndex='z-[31]'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button
                  variant='ghost'
                  data-testid='composer.toggleSidebarWithinSidebar'
                  onClick={() => setDisplayState(displayState === 'show' ? 'hide' : 'show')}
                  className='pli-1'
                >
                  <ArrowLineLeft className={getSize(4)} />
                </Button>
              </Tooltip>
            </div>
            <Separator flush />
            <DocumentTree />
            <Separator flush />
            {identity && (
              <div role='none' className='shrink-0 flex items-center gap-1 pli-3 plb-1.5'>
                <Avatar
                  size={6}
                  variant='circle'
                  fallbackValue={identity.identityKey.toHex()}
                  status='active'
                  label={
                    <p className='grow text-sm'>{identity.profile?.displayName ?? identity.identityKey.truncate()}</p>
                  }
                />
                <Tooltip content={t('profile settings label')} zIndex='z-[31]' side='bottom' tooltipLabelsTrigger>
                  <Button
                    variant='ghost'
                    data-testid='composer.openUserSettingsDialog'
                    onClick={() => setSettingsDialogOpen(true)}
                    className='pli-1'
                  >
                    <GearSix className={mx(getSize(4), 'rotate-90')} />
                  </Button>
                </Tooltip>
              </div>
            )}
          </div>
        </DensityProvider>
      </ElevationProvider>
    </ThemeContext.Provider>
  );
};

const SidebarToggle = () => {
  const { displayState, setDisplayState } = useContext(PanelSidebarContext);
  const { t } = useTranslation('os');
  const open = displayState === 'show';
  const button = (
    <Button data-testid='composer.toggleSidebar' onClick={() => setDisplayState('show')} className='p-0 is-[40px]'>
      <Sidebar weight='light' className={getSize(6)} />
    </Button>
  );
  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <div
        role='none'
        className={mx(
          'fixed block-start-0 p-2 transition-[inset-inline-start,opacity] ease-in-out duration-200',
          open ? 'inline-start-sidebar opacity-0 pointer-events-none' : 'inline-start-0 opacity-100'
        )}
      >
        {open ? (
          button
        ) : (
          <Tooltip content={t('open sidebar label')} tooltipLabelsTrigger side='right'>
            {button}
          </Tooltip>
        )}
      </div>
    </ThemeContext.Provider>
  );
};

export { SidebarContent, SidebarToggle };
