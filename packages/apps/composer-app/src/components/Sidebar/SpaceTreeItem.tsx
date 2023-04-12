//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, Download, EyeSlash, PaperPlaneTilt, Plus, Upload } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Tooltip, useFileDownload } from '@dxos/react-appkit';
import { observer, ShellLayout, Space, useIdentity, useQuery } from '@dxos/react-client';
import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  getSize,
  Input,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
  TreeBranch,
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  useTranslation
} from '@dxos/react-components';
import { useShell } from '@dxos/react-ui';

import { ComposerDocument } from '../../proto';
import { abbreviateKey, getPath } from '../../router';
import { backupSpace } from '../../util';
import { Separator } from '../Separator';
import { DocumentTreeItem } from './DocumentTreeItem';

export const SpaceTreeItem = observer(({ space }: { space: Space }) => {
  const documents = useQuery(space, ComposerDocument.filter());
  const { t } = useTranslation('composer');
  const navigate = useNavigate();
  const shell = useShell();
  const { spaceKey, docKey } = useParams();
  const identity = useIdentity();
  const hasActiveDocument = !!(docKey && documents.map(({ id }) => id).indexOf(docKey) >= 0);
  const download = useFileDownload();

  const handleCreate = useCallback(async () => {
    const document = await space.db.add(new ComposerDocument());
    return navigate(getPath(space.key, document.id));
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

  const spaceDisplayName = (space.properties.name?.length ?? 0) > 0 ? space.properties.name : t('untitled space title');

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
          {spaceDisplayName}
        </TreeItemHeading>
        <TooltipRoot>
          <TooltipContent className='z-[31]' side='bottom'>
            {t('space options label')}
          </TooltipContent>
          <DropdownMenu
            trigger={
              <TooltipTrigger asChild>
                <Button variant='ghost' data-testid='composer.openSpaceMenu' className='shrink-0 pli-1'>
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
                placeholder={t('untitled space title')}
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
            <Separator />
            <DropdownMenuItem
              className='flex items-center gap-2'
              onClick={async () => {
                const backupBlob = await backupSpace(space, t('untitled document title'));
                return download(backupBlob, `${spaceDisplayName} backup.zip`);
              }}
            >
              <Download className={getSize(4)} />
              <span>{t('download all docs in space label')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className='flex items-center gap-2'>
              <Upload className={getSize(4)} />
              <span>{t('upload all docs in space label')}</span>
            </DropdownMenuItem>
          </DropdownMenu>
        </TooltipRoot>
        <Tooltip content={t('create document label')} tooltipLabelsTrigger side='bottom' zIndex='z-[31]'>
          <Button
            variant='ghost'
            data-testid='composer.createDocument'
            className='shrink-0 pli-1'
            onClick={handleCreate}
          >
            <span className='sr-only'>{t('create document label')}</span>
            <Plus className={getSize(4)} />
          </Button>
        </Tooltip>
      </div>
      <TreeItemBody>
        {documents.length > 0 && (
          <TreeBranch collapsible={false}>
            {documents.map((document) => (
              <DocumentTreeItem key={document.id} document={document} linkTo={getPath(space.key, document.id)} />
            ))}
          </TreeBranch>
        )}
      </TreeItemBody>
    </TreeItem>
  );
});
