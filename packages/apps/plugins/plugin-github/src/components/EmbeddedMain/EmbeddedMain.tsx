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

import { SPACE_PLUGIN, SpaceAction, getSpaceDisplayName } from '@braneframe/plugin-space';
import { Surface, useIntent } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { getMeta } from '@dxos/react-client/echo';
import {
  Avatar,
  Button,
  ButtonGroup,
  DensityProvider,
  Dialog,
  DropdownMenu,
  Main,
  Toggle,
  Tooltip,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { defaultTx, descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { hexToFallback } from '@dxos/util';

import { GfmPreview } from './GfmPreview';
import { useDocGhId } from '../../hooks';
import { GITHUB_PLUGIN } from '../../meta';
import type { EditorViewState } from '../../types';
import {
  DocumentResolverProvider,
  DocumentResolverContext,
  ResolverDialog,
  SpaceResolverProvider,
  SpaceResolverContext,
} from '../GithubEchoResolverProviders';

const overlayAttrs = { side: 'top' as const, sideOffset: 4 };

const EmbeddedLayoutImpl = () => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const { space, source, id, identityHex } = useContext(SpaceResolverContext);
  const { document } = useContext(DocumentResolverContext);
  const { dispatch } = useIntent();
  const client = useClient();

  const handleCloseEmbed = useCallback(() => {
    window.parent.postMessage({ type: 'close-embed' }, 'https://github.com');
  }, []);

  const handleSaveAndCloseEmbed = useCallback(() => {
    document &&
      window.parent.postMessage({ type: 'save-data', content: document.content?.content }, 'https://github.com');
  }, [document]);

  const handleCreateSpace = () => dispatch({ action: SpaceAction.CREATE });
  const handleJoinSpace = () => dispatch({ action: SpaceAction.JOIN });

  const handleInvite = useCallback(() => {
    if (client && space) {
      void client.shell.shareSpace({ spaceKey: space.key });
    }
  }, [client, space]);

  const [editorViewState, setEditorViewState] = useState<EditorViewState>('editor');
  const isPreviewing = editorViewState === 'preview';

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [resolverDialogOpen, setResolverDialogOpen] = useState(false);

  const spaceFallbackValue = hexToFallback(space?.key.toHex() ?? '0');

  const docGhId = useDocGhId((document ? getMeta(document)?.keys : []) ?? []);
  const name = space && getSpaceDisplayName(space);

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
                    <DotsThreeVertical className={getSize(5)} />
                    <span className='sr-only'>{t('embedded options label')}</span>
                  </Button>
                </DropdownMenu.Trigger>
              </Tooltip.Trigger>
              <DropdownMenu.Content {...overlayAttrs}>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item asChild>
                    <a
                      target='_blank'
                      rel='noreferrer'
                      href={
                        space && document
                          ? `${location.origin}/dxos/space/${space?.key.toHex() ?? 'never'}/${document.id}`
                          : '#'
                      }
                    >
                      <ArrowSquareOut className={mx('shrink-0', getSize(5))} />
                      <span className='grow'>{t('open in composer label', { ns: GITHUB_PLUGIN })}</span>
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.GroupLabel>
                    {t('active space label', { ns: SPACE_PLUGIN })}
                    <Avatar.Root size={5} variant='circle'>
                      <div role='none' className='flex gap-1 mlb-1 items-center'>
                        <Avatar.Frame>
                          <Avatar.Fallback text={spaceFallbackValue.emoji} />
                        </Avatar.Frame>
                        <Avatar.Label classNames='text-sm text-[--surface-text]'>
                          {name && toLocalizedString(name, t)}
                        </Avatar.Label>
                      </div>
                    </Avatar.Root>
                  </DropdownMenu.GroupLabel>
                  <DropdownMenu.Item onClick={() => setRenameDialogOpen(true)}>
                    <span className='grow'>{t('rename space label', { ns: SPACE_PLUGIN })}</span>
                    <PencilSimpleLine className={mx('shrink-0', getSize(5))} />
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => setResolverDialogOpen(true)}>
                    <span className='grow'>{t('unset repo space label')}</span>
                    <Option className={mx('shrink-0', getSize(5))} />
                  </DropdownMenu.Item>
                </DropdownMenu.Viewport>
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
                  <DropdownMenu.Viewport>
                    <DropdownMenu.Item onClick={handleSaveAndCloseEmbed} classNames='block'>
                      <p>{t('save and close label')}</p>
                      <p className={descriptionText}>{t('save and close description')}</p>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={handleCloseEmbed} classNames='block'>
                      <p>{t('close label', { ns: 'appkit' })}</p>
                      <p className={descriptionText}>{t('close embed description')}</p>
                    </DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </ButtonGroup>
        </div>
        {space && document ? (
          editorViewState === 'preview' ? (
            <Main.Content classNames='min-bs-[100dvh] flex flex-col p-0.5'>
              <GfmPreview
                markdown={document.content?.toString() ?? ''}
                {...(docGhId && { owner: docGhId.owner, repo: docGhId.repo })}
              />
            </Main.Content>
          ) : (
            // TODO(burdon): This will break since model is not defined.
            <Surface role='main' data={{ properties: document, view: 'embedded' }} />
          )
        ) : source && id && identityHex ? (
          <Dialog.Root open onOpenChange={() => true}>
            <div role='none' className={defaultTx('dialog.overlay', 'dialog--resolver__overlay', {}, 'static bs-full')}>
              <div
                role='none'
                className={defaultTx(
                  'dialog.content',
                  'dialog--resolver__content',
                  {},
                  'p-2 bs-72 flex flex-col shadow-none bg-transparent',
                )}
              >
                <ResolverDialog handleCreateSpace={handleCreateSpace} handleJoinSpace={handleJoinSpace} />
              </div>
            </div>
          </Dialog.Root>
        ) : null}
        {space && (
          <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <Dialog.Overlay classNames='backdrop-blur'>
              <Dialog.Content>
                <Surface role='dialog' data={{ content: 'dxos.org/plugin/space/RenameSpaceDialog', subject: space }} />
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Root>
        )}
        <Dialog.Root open={resolverDialogOpen} onOpenChange={setResolverDialogOpen}>
          <Dialog.Overlay classNames='backdrop-blur'>
            <Dialog.Content>
              <ResolverDialog handleCreateSpace={handleCreateSpace} handleJoinSpace={handleJoinSpace} />
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
