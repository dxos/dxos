//
// Copyright 2023 DXOS.org
//
import './embedded.css';

import {
  ArrowSquareOut,
  CaretDown,
  DotsThreeVertical,
  Eye,
  Option,
  PencilSimpleLine,
  UserPlus,
} from '@phosphor-icons/react';
import React, { useCallback, useContext, useRef, useState } from 'react';

import {
  Avatar,
  Button,
  ButtonGroup,
  DensityProvider,
  Dialog,
  Toggle,
  useTranslation,
  DropdownMenu,
  Tooltip,
  useJdenticonHref,
} from '@dxos/aurora';
import { defaultDescription, getSize, mx, osTx } from '@dxos/aurora-theme';
import { ShellLayout } from '@dxos/client';
import { useShell } from '@dxos/react-shell';

import { DialogRenameSpace } from '../../../SpacePlugin/components/DialogRenameSpace';
import { getSpaceDisplayName } from '../../../SpacePlugin/getSpaceDisplayName';
import {
  DocumentResolverProvider,
  DocumentResolverContext,
  ResolverDialog,
  SpaceResolverProvider,
  SpaceResolverContext,
} from '../GithubEchoResolverProviders';
import { MarkdownDocument } from '../_MarkdownDocument';
import { EditorViewState } from '../props';

const overlayAttrs = { side: 'top' as const, sideOffset: 4 };

const EmbeddedLayoutImpl = () => {
  const { t } = useTranslation('composer');
  const { space, source, id, identityHex } = useContext(SpaceResolverContext);
  const { document } = useContext(DocumentResolverContext);
  const shell = useShell();

  const handleCloseEmbed = useCallback(() => {
    window.parent.postMessage({ type: 'close-embed' }, 'https://github.com');
  }, []);

  const handleSaveAndCloseEmbed = useCallback(() => {
    document && window.parent.postMessage({ type: 'save-data', content: document.content.text }, 'https://github.com');
  }, [document]);

  const handleInvite = useCallback(() => {
    void shell.setLayout(ShellLayout.SPACE_INVITATIONS, space?.key && { spaceKey: space.key });
  }, [shell, space]);

  const [editorViewState, setEditorViewState] = useState<EditorViewState>('editor');
  const isPreviewing = editorViewState === 'preview';

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [resolverDialogOpen, setResolverDialogOpen] = useState(false);

  const spaceJdenticon = useJdenticonHref(space?.key.toHex() ?? '', 6);

  return (
    <>
      <style type='text/css'>{`
        :root {
          --surface-bg: #F6F8FA;
        }
        .dark:root {
          --surface-bg: #161b22;
        }
      `}</style>
      <DensityProvider density='fine'>
        <div role='none' className='fixed inline-end-2 block-end-2 z-10 flex gap-2'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button disabled={!space} onClick={handleInvite}>
                <span className='sr-only'>{t('create invitation label', { ns: 'appkit' })}</span>
                <UserPlus className={getSize(5)} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content {...overlayAttrs}>
              {t('create invitation label', { ns: 'appkit' })}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Toggle
                disabled={!(space && document)}
                pressed={isPreviewing}
                onPressedChange={(nextPressed) => setEditorViewState(nextPressed ? 'preview' : 'editor')}
              >
                <span className='sr-only'>{t(isPreviewing ? 'exit gfm preview label' : 'preview gfm label')}</span>
                {isPreviewing ? <PencilSimpleLine className={getSize(5)} /> : <Eye className={getSize(5)} />}
              </Toggle>
            </Tooltip.Trigger>
            <Tooltip.Content {...overlayAttrs}>
              {t(isPreviewing ? 'exit gfm preview label' : 'preview gfm label')}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root
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
            <DropdownMenu.Root
              {...{
                modal: false,
                open: optionsMenuOpen,
                onOpenChange: (nextOpen: boolean) => {
                  if (!nextOpen) {
                    suppressNextTooltip.current = true;
                  }
                  return setOptionsMenuOpen(nextOpen);
                },
              }}
            >
              <Tooltip.Trigger asChild>
                <DropdownMenu.Trigger asChild disabled={!(space && document)}>
                  <Button>
                    <span className='sr-only'>{t('embedded options label')}</span>
                    <DotsThreeVertical className={getSize(5)} />
                  </Button>
                </DropdownMenu.Trigger>
              </Tooltip.Trigger>
              <DropdownMenu.Content {...overlayAttrs}>
                <DropdownMenu.Item asChild>
                  <a
                    target='_blank'
                    rel='noreferrer'
                    href={
                      space && document
                        ? `${location.origin}/space/${space?.key.toHex() ?? 'never'}/${document.id}`
                        : '#'
                    }
                  >
                    <span className='grow'>{t('open in composer label')}</span>
                    <ArrowSquareOut className={mx('shrink-0', getSize(5))} />
                  </a>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.GroupLabel>
                  {t('active space label')}
                  <Avatar.Root size={5} variant='circle'>
                    <div role='none' className='flex gap-1 mlb-1 items-center'>
                      <Avatar.Frame>
                        <Avatar.Fallback href={spaceJdenticon} />
                      </Avatar.Frame>
                      <Avatar.Label classNames='text-sm text-[--surface-text]'>
                        {space && getSpaceDisplayName(t, space)}
                      </Avatar.Label>
                    </div>
                  </Avatar.Root>
                </DropdownMenu.GroupLabel>
                <DropdownMenu.Item onClick={() => setRenameDialogOpen(true)}>
                  <span className='grow'>{t('rename space label')}</span>
                  <PencilSimpleLine className={mx('shrink-0', getSize(5))} />
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setResolverDialogOpen(true)}>
                  <span className='grow'>{t('unset repo space label')}</span>
                  <Option className={mx('shrink-0', getSize(5))} />
                </DropdownMenu.Item>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
              <Tooltip.Content {...overlayAttrs}>
                {t('embedded options label')}
                <Tooltip.Arrow />
              </Tooltip.Content>
            </DropdownMenu.Root>
          </Tooltip.Root>
          <ButtonGroup classNames={[!(space && document) && 'shadow-none']}>
            <Button disabled={!(space && document)} onClick={handleSaveAndCloseEmbed}>
              {t('save and close label')}
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild disabled={!(space && document)}>
                <Button>
                  <CaretDown />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content {...overlayAttrs}>
                  <DropdownMenu.Item onClick={handleSaveAndCloseEmbed} classNames='block'>
                    <p>{t('save and close label')}</p>
                    <p className={defaultDescription}>{t('save and close description')}</p>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={handleCloseEmbed} classNames='block'>
                    <p>{t('close label', { ns: 'appkit' })}</p>
                    <p className={defaultDescription}>{t('close embed description')}</p>
                  </DropdownMenu.Item>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </ButtonGroup>
        </div>
        {space && document ? (
          <MarkdownDocument {...{ layout: 'embedded', space, document, editorViewState, setEditorViewState }} />
        ) : source && id && identityHex ? (
          <Dialog.Root open onOpenChange={() => true}>
            <div role='none' className={osTx('dialog.overlay', 'dialog--resolver__overlay', {}, 'static bs-full')}>
              <div
                role='none'
                className={osTx(
                  'dialog.content',
                  'dialog--resolver__content',
                  {},
                  'p-2 bs-72 flex flex-col shadow-none bg-transparent',
                )}
              >
                <ResolverDialog />
              </div>
            </div>
          </Dialog.Root>
        ) : null}
        {space && (
          <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <Dialog.Overlay classNames='backdrop-blur'>
              <Dialog.Content>
                <DialogRenameSpace data={['dxos:SpacePlugin/RenameSpaceDialog', space]} />
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Root>
        )}
        <Dialog.Root open={resolverDialogOpen} onOpenChange={setResolverDialogOpen}>
          <Dialog.Overlay classNames='backdrop-blur'>
            <Dialog.Content>
              <ResolverDialog />
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Root>
      </DensityProvider>
    </>
  );
};

export const EmbeddedMain = () => {
  return (
    <SpaceResolverProvider>
      <DocumentResolverProvider>
        <EmbeddedLayoutImpl />
      </DocumentResolverProvider>
    </SpaceResolverProvider>
  );
};
