//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft, Circle, FileText, Intersect, PaperPlaneTilt, Planet, Plus, Sidebar } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import {
  PublicKey,
  ShellLayout,
  Space,
  Text,
  useClient,
  useIdentity,
  useQuery,
  useSpace,
  useSpaces,
  withReactor
} from '@dxos/react-client';
import {
  Avatar,
  Button,
  buttonStyles,
  DensityProvider,
  ElevationProvider,
  getSize,
  ListItemEndcap,
  mx,
  ThemeContext,
  Tooltip,
  TreeBranch,
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  TreeRoot,
  useId,
  useTranslation
} from '@dxos/react-components';
import { PanelSidebarContext, useShell } from '@dxos/react-ui';

import { ComposerDocument } from '../proto';
import { abbreviateKey, getPath } from '../routes';

const DocumentTreeItem = withReactor(({ document, linkTo }: { document: ComposerDocument; linkTo: string }) => {
  const { t } = useTranslation('composer');
  const { docKey } = useParams();
  const active = docKey === document.id;
  return (
    <TreeItem>
      <TreeItemHeading asChild>
        <Link
          to={linkTo}
          className={mx(buttonStyles({ variant: 'ghost' }), 'is-full text-base p-0 font-normal items-start gap-1')}
        >
          <FileText weight='regular' className={mx(getSize(4), 'mbs-2')} />
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

const SpaceTreeItem = withReactor(({ space }: { space: Space }) => {
  const documents = useQuery(space, ComposerDocument.filter());
  const { t } = useTranslation('composer');
  const navigate = useNavigate();
  const shell = useShell();
  const { spaceKey, docKey } = useParams();
  const hasActiveDocument = !!(docKey && documents.map(({ id }) => id).indexOf(docKey) >= 0);

  const handleCreate = useCallback(async () => {
    const document = await space.db.add(new ComposerDocument());
    document.content = new Text(); // TODO(burdon): Make automatic?
    return navigate(getPath(space, document));
  }, [space, navigate]);

  const handleViewInvitations = async () => shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key });

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
        <TreeItemHeading className='grow break-words pbs-1.5 text-sm font-medium'>
          {space.properties.name ?? space.key.truncate()}
        </TreeItemHeading>
        <Tooltip
          content={t('view space invitations label', { ns: 'os' })}
          tooltipLabelsTrigger
          side='bottom'
          zIndex='z-40'
        >
          <Button variant='ghost' className='shrink-0 pli-1' onClick={handleViewInvitations}>
            <PaperPlaneTilt className={getSize(4)} />
          </Button>
        </Tooltip>
        <Tooltip content={t('create document label')} tooltipLabelsTrigger side='bottom' zIndex='z-40'>
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

const DocumentTree = () => {
  const spaces = useSpaces();
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation('composer');
  return (
    <div className='grow plb-1.5 pis-1 pie-1.5 min-bs-0 overflow-y-auto'>
      <span className='sr-only' id={treeLabel}>
        {t('sidebar tree label')}
      </span>
      <TreeRoot labelId={treeLabel}>
        {spaces.map((space) => {
          return <SpaceTreeItem key={space.key.toHex()} space={space} />;
        })}
      </TreeRoot>
    </div>
  );
};

const SidebarContent = () => {
  const client = useClient();
  const shell = useShell();
  const navigate = useNavigate();
  const { t } = useTranslation('composer');
  const { spaceKey } = useParams();
  const space = useSpace(spaceKey ? PublicKey.fromHex(spaceKey) : undefined);
  const { displayState, setDisplayState } = useContext(PanelSidebarContext);
  const identity = useIdentity();

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    const document = await space.db.add(new ComposerDocument());
    document.content = new Text(); // TODO(burdon): Make automatic?
    return navigate(getPath(space, document));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space?.key });
  };

  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <ElevationProvider elevation='chrome'>
        <DensityProvider density='fine'>
          <div role='none' className='flex flex-col bs-full'>
            <div role='none' className='shrink-0 flex items-center pli-1.5 plb-1.5'>
              <h1 className={mx('grow font-system-medium text-lg pli-1.5')}>{t('current app name')}</h1>
              <Tooltip
                content={t('create space label', { ns: 'appkit' })}
                zIndex='z-40'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button variant='ghost' onClick={handleCreateSpace} className='pli-1'>
                  <Planet className={getSize(4)} />
                </Button>
              </Tooltip>
              <Tooltip
                content={t('join space label', { ns: 'appkit' })}
                zIndex='z-40'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button variant='ghost' onClick={handleJoinSpace} className='pli-1'>
                  <Intersect className={getSize(4)} />
                </Button>
              </Tooltip>
              <Tooltip
                content={t('close sidebar label', { ns: 'os' })}
                zIndex='z-40'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button
                  variant='ghost'
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
                  label={<p className='text-sm'>{identity.profile?.displayName ?? identity.identityKey.truncate()}</p>}
                />
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
    <Button onClick={() => setDisplayState('show')} className='p-0 is-[40px] shadow-md'>
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
