//
// Copyright 2023 DXOS.org
//

import {
  ArrowLineLeft,
  Article,
  ArticleMedium,
  Circle,
  DotsThreeVertical,
  EyeSlash,
  GearSix,
  Intersect,
  PaperPlaneTilt,
  Planet,
  Plus,
  Sidebar
} from '@phosphor-icons/react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { Tooltip } from '@dxos/react-appkit';
import { observer, ShellLayout, Space, useClient, useIdentity, useQuery, useSpaces } from '@dxos/react-client';
import {
  Avatar,
  Button,
  buttonStyles,
  DensityProvider,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  ElevationProvider,
  getSize,
  Input,
  ListItemEndcap,
  mx,
  ThemeContext,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
  TreeBranch,
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  TreeRoot,
  useId,
  useTranslation
} from '@dxos/react-components';
import { TextKind } from '@dxos/react-composer';
import { PanelSidebarContext, useShell } from '@dxos/react-ui';

import { ComposerDocument } from '../../proto';
import { abbreviateKey, getPath } from '../../router';
import { useOctokitContext } from '../OctokitProvider';

const DocumentTreeItem = observer(({ document, linkTo }: { document: ComposerDocument; linkTo: string }) => {
  const { t } = useTranslation('composer');
  const { docKey } = useParams();
  const active = docKey === document.id;
  const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;
  return (
    <TreeItem>
      <TreeItemHeading asChild>
        <Link
          to={linkTo}
          className={mx(buttonStyles({ variant: 'ghost' }), 'is-full text-base p-0 font-normal items-start gap-1')}
          data-testid='composer.documentTreeItemHeading'
        >
          <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
          <p className='grow mbs-1'>{document.title || t('untitled document title')}</p>
          <ListItemEndcap className='is-6 flex items-center'>
            <Circle
              weight='fill'
              className={mx(getSize(3), 'text-primary-500 dark:text-primary-300', !active && 'invisible')}
            />
          </ListItemEndcap>
        </Link>
      </TreeItemHeading>
    </TreeItem>
  );
});

const SpaceTreeItem = observer(({ space }: { space: Space }) => {
  const documents = useQuery(space, ComposerDocument.filter());
  const { t } = useTranslation('composer');
  const navigate = useNavigate();
  const shell = useShell();
  const { spaceKey, docKey } = useParams();
  const identity = useIdentity();
  const hasActiveDocument = !!(docKey && documents.map(({ id }) => id).indexOf(docKey) >= 0);

  const handleCreate = useCallback(async () => {
    const document = await space.db.add(new ComposerDocument());
    return navigate(getPath(space, document));
  }, [space, navigate]);

  const handleViewInvitations = async () => shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key });

  const handleHideSpace = () => {
    if (identity) {
      const identityHex = identity.identityKey.toHex();
      space.properties.members = {
        ...space.properties.members,
        [identityHex]: {
          ...space.properties.members?.[identityHex],
          hidden: true
        }
      };
      if (spaceKey === abbreviateKey(space.key)) {
        navigate('/');
      }
    }
  };

  const [open, setOpen] = useState(spaceKey === abbreviateKey(space.key));

  useEffect(() => {
    spaceKey === abbreviateKey(space.key) && setOpen(true);
  }, [spaceKey]);

  return (
    <TreeItem
      collapsible
      open={open}
      onOpenChange={setOpen}
      slots={{
        root: { className: 'mbe-2' },
        ...(hasActiveDocument &&
          !open && { openTriggerIcon: { weight: 'fill', className: 'text-primary-500 dark:text-primary-300' } })
      }}
    >
      <div role='none' className='flex mis-1 items-start'>
        <TreeItemHeading
          className='grow break-words pbs-1.5 text-sm font-medium'
          data-testid='composer.spaceTreeItemHeading'
        >
          {(space.properties.name?.length ?? 0) > 0 ? space.properties.name : space.key.truncate()}
        </TreeItemHeading>
        <TooltipRoot>
          <TooltipContent className='z-[31]' side='bottom'>
            {t('space options label')}
          </TooltipContent>
          <DropdownMenu
            trigger={
              <TooltipTrigger asChild>
                <Button variant='ghost' className='shrink-0 pli-1'>
                  <DotsThreeVertical className={getSize(4)} />
                </Button>
              </TooltipTrigger>
            }
            slots={{ content: { className: 'z-[31]' } }}
          >
            <DropdownMenuItem asChild>
              <Input
                label={t('space name label')}
                labelVisuallyHidden
                value={space.properties.name ?? ''}
                placeholder={space.key.truncate()}
                onChange={({ target: { value } }) => (space.properties.name = value)}
              />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleViewInvitations} className='flex items-center gap-2'>
              <PaperPlaneTilt className={getSize(4)} />
              <span>{t('view space invitations label', { ns: 'os' })}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleHideSpace} className='flex items-center gap-2'>
              <EyeSlash className={getSize(4)} />
              <span>{t('hide space label')}</span>
            </DropdownMenuItem>
          </DropdownMenu>
        </TooltipRoot>
        <Tooltip content={t('create document label')} tooltipLabelsTrigger side='bottom' zIndex='z-[31]'>
          <Button variant='ghost' className='shrink-0 pli-1' onClick={handleCreate}>
            <span className='sr-only'>{t('create document label')}</span>
            <Plus className={getSize(4)} />
          </Button>
        </Tooltip>
      </div>
      <TreeItemBody>
        {documents.length > 0 && (
          <TreeBranch collapsible={false}>
            {documents.map((document) => (
              <DocumentTreeItem key={document.id} document={document} linkTo={getPath(space, document)} />
            ))}
          </TreeBranch>
        )}
      </TreeItemBody>
    </TreeItem>
  );
});

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
    return navigate(getPath(space, document));
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
            <div role='separator' className='bs-px mli-2.5 bg-neutral-500/20' />
            <DocumentTree />
            <div role='separator' className='bs-px mli-2.5 bg-neutral-500/20' />
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
    <Button
      data-testid='composer.toggleSidebar'
      onClick={() => setDisplayState('show')}
      className='p-0 is-[40px] shadow-md'
    >
      <Sidebar className={getSize(6)} />
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
