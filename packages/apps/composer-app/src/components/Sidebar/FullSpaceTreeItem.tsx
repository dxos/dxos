//
// Copyright 2023 DXOS.org
//

import {
  CaretDown,
  CaretRight,
  DotsThreeVertical,
  Download,
  EyeSlash,
  FilePlus,
  PaperPlaneTilt,
  Plus,
  Upload
} from '@phosphor-icons/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { useNavigate, useParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { Button, useTranslation } from '@dxos/aurora';
import { defaultDescription, defaultDisabled, getSize, mx } from '@dxos/aurora-theme';
import { SpaceState } from '@dxos/client';
import {
  Tooltip,
  useFileDownload,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  Input,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
  TreeBranch,
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  TreeItemOpenTrigger
} from '@dxos/react-appkit';
import { useMulticastObservable } from '@dxos/react-async';
import { observer, ShellLayout, Space, useIdentity, useQuery } from '@dxos/react-client';
import { useShell } from '@dxos/react-shell';

import { abbreviateKey, getPath } from '../../router';
import { backupSpace, restoreSpace } from '../../util';
import { getSpaceDisplayName } from '../../util/getSpaceDisplayName';
import { Separator } from '../Separator';
import { DocumentLinkTreeItem } from './DocumentLinkTreeItem';

export const FullSpaceTreeItem = observer(({ space }: { space: Space }) => {
  const documents = useQuery(space, Document.filter());
  const { t } = useTranslation('composer');
  const navigate = useNavigate();
  const shell = useShell();
  const { spaceKey, docKey } = useParams();
  const identity = useIdentity();
  const hasActiveDocument = !!(docKey && documents.map(({ id }) => id).indexOf(docKey) >= 0);
  const download = useFileDownload();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const spaceSate = useMulticastObservable(space.state);
  const disabled = spaceSate !== SpaceState.READY;

  const handleCreate = useCallback(async () => {
    const document = await space.db.add(new Document());
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

  const spaceDisplayName = getSpaceDisplayName(t, space, disabled);

  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOpetionsMenuOpen] = useState(false);

  return (
    <TreeItem
      collapsible
      open={open}
      onOpenChange={setOpen}
      className={['mbe-2 block', disabled && defaultDisabled]}
      {...(disabled && { 'aria-disabled': true })}
    >
      <div role='none' className='flex mis-1 items-start'>
        <TreeItemOpenTrigger>
          <OpenTriggerIcon
            {...(hasActiveDocument && !open && { weight: 'fill', className: 'text-primary-500 dark:text-primary-300' })}
          />
        </TreeItemOpenTrigger>
        <TreeItemHeading
          className='grow break-words pbs-1.5 text-sm font-medium'
          data-testid='composer.spaceTreeItemHeading'
        >
          {spaceDisplayName}
        </TreeItemHeading>
        <TooltipRoot
          open={optionsTooltipOpen}
          onOpenChange={(nextOpen) => {
            if (suppressNextTooltip.current) {
              setOptionsTooltipOpen(false);
              suppressNextTooltip.current = false;
            } else {
              setOptionsTooltipOpen(nextOpen);
            }
          }}
        >
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
            slots={{
              root: {
                open: optionsMenuOpen,
                onOpenChange: (nextOpen: boolean) => {
                  if (!nextOpen) {
                    suppressNextTooltip.current = true;
                  }
                  return setOpetionsMenuOpen(nextOpen);
                }
              },
              content: { className: 'z-[31]' }
            }}
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
            <DropdownMenuItem className='flex items-center gap-2' onClick={() => setRestoreDialogOpen(true)}>
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
        {documents.length > 0 ? (
          <TreeBranch>
            {documents.map((document) => (
              <DocumentLinkTreeItem key={document.id} document={document} linkTo={getPath(space.key, document.id)} />
            ))}
          </TreeBranch>
        ) : (
          <div
            role='none'
            className={mx(
              'p-2 mli-2 mbe-2 text-center border border-dashed border-neutral-400/50 rounded-xl',
              defaultDescription
            )}
          >
            {t('empty space message')}
          </div>
        )}
      </TreeItemBody>
      <Dialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        title={t('confirm restore title')}
        slots={{ overlay: { className: 'backdrop-blur-sm' } }}
      >
        <p className='mlb-4'>{t('confirm restore body')}</p>
        <FileUploader
          types={['zip']}
          classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
          dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
          handleChange={(backupFile: File) =>
            restoreSpace(space, backupFile).finally(() => setRestoreDialogOpen(false))
          }
        >
          <FilePlus weight='duotone' className={getSize(8)} />
          <span>{t('upload file message')}</span>
        </FileUploader>
        <Button className='block is-full' onClick={() => setRestoreDialogOpen?.(false)}>
          {t('cancel label', { ns: 'appkit' })}
        </Button>
      </Dialog>
    </TreeItem>
  );
});
