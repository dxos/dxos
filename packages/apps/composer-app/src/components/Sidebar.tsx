//
// Copyright 2023 DXOS.org
//

import { Circle, CircleHalf, FilePlus, FileText, Intersect, Planet, StarFour } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import {
  PublicKey,
  ShellLayout,
  Space,
  Text,
  useClient,
  useQuery,
  useSpace,
  useSpaces,
  withReactor
} from '@dxos/react-client';
import {
  Button,
  buttonStyles,
  DensityProvider,
  ElevationProvider,
  getSize,
  Input,
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
          <FileText weight='regular' className={mx(getSize(5), 'mbs-1.5')} />
          <p className='grow mbs-1'>{document.title || t('untitled document title')}</p>
          <ListItemEndcap className='flex items-center'>
            <Circle weight='fill' className={mx(getSize(3), 'text-primary-500', !active && 'invisible')} />
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
  const { spaceKey, docKey } = useParams();
  const hasActiveDocument = !!(docKey && documents.map(({ id }) => id).indexOf(docKey) >= 0);

  const handleCreate = useCallback(async () => {
    const document = await space.db.add(new ComposerDocument());
    document.content = new Text(); // TODO(burdon): Make automatic?
    return navigate(getPath(space, document));
  }, [space, navigate]);

  const [open, setOpen] = useState(spaceKey === abbreviateKey(space.key));

  useEffect(() => {
    setOpen(spaceKey === abbreviateKey(space.key));
  }, [spaceKey]);

  return (
    <TreeItem collapsible open={open} onOpenChange={setOpen} slots={{ root: { className: 'mbe-2' } }}>
      <TreeItemHeading className='sr-only'>{space.properties.name ?? space.key.truncate()}</TreeItemHeading>
      <div role='none' className='flex mis-1'>
        <Input
          variant='subdued'
          label='Space name'
          labelVisuallyHidden
          value={space.properties.name ?? ''}
          onChange={({ target: { value } }) => {
            space.properties.name = value;
          }}
          placeholder={space.key.truncate()}
          slots={{ root: { className: 'grow' } }}
        />
        <ListItemEndcap className='flex items-center'>
          <CircleHalf
            weight='fill'
            className={mx(getSize(3), 'text-primary-500', !(hasActiveDocument && !open) && 'invisible')}
          />
        </ListItemEndcap>
      </div>
      <TreeItemBody>
        {documents.length > 0 && (
          <TreeBranch collapsible={false}>
            {documents.map((document) => (
              <DocumentTreeItem key={document.id} document={document} linkTo={getPath(space, document)} />
            ))}
          </TreeBranch>
        )}
        <Button variant='ghost' className='is-full gap-1 justify-start -mis-2.5' onClick={handleCreate}>
          <FilePlus weight='regular' className={getSize(5)} />
          <span>{t('create document label')}</span>
        </Button>
      </TreeItemBody>
    </TreeItem>
  );
});

const DocumentTree = () => {
  const spaces = useSpaces();
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation('composer');
  return (
    <div className='grow pli-1.5 min-bs-0 overflow-y-auto'>
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

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(getPath(space));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space?.key });
  };

  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <ElevationProvider elevation='chrome'>
        <DensityProvider density='fine'>
          <div role='none' className='flex flex-col bs-full gap-2 plb-2'>
            <h1 className={mx('shrink-0 font-system-medium text-lg pli-2')}>{t('current app name')}</h1>
            <DocumentTree />
            <div role='none' className='shrink-0 flex flex-wrap gap-1 pli-1.5'>
              <Button className='grow gap-1' onClick={handleJoinSpace}>
                <Intersect className={getSize(4)} />
                <span>{t('join space label', { ns: 'appkit' })}</span>
              </Button>
              <Button className='grow gap-1' onClick={handleCreateSpace}>
                <Planet className={getSize(4)} />
                <span>{t('create space label', { ns: 'appkit' })}</span>
              </Button>
            </div>
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
  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <div
        role='none'
        className={mx(
          'fixed block-end-0 p-2 transition-[inset-inline-start] ease-in-out duration-200',
          open ? 'inline-start-sidebar' : 'inline-start-0'
        )}
      >
        <Tooltip content={t(open ? 'close sidebar label' : 'open sidebar label')} tooltipLabelsTrigger side='right'>
          <Button onClick={() => setDisplayState(open ? 'hide' : 'show')} className='p-0 bs-[40px] is-[40px] shadow-md'>
            <StarFour
              className={mx(
                getSize(6),
                'transition-transform ease-in-out duration-200',
                open ? 'rotate-45' : 'rotate-0'
              )}
            />
          </Button>
        </Tooltip>
      </div>
    </ThemeContext.Provider>
  );
};

export { SidebarContent, SidebarToggle };
