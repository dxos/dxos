//
// Copyright 2023 DXOS.org
//

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

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { getSpaceDisplayName } from '@braneframe/plugin-space';
import {
  Avatar,
  Button,
  ButtonGroup,
  DensityProvider,
  Dialog,
  Toggle,
  Main,
  useTranslation,
  DropdownMenu,
  Tooltip,
  useJdenticonHref,
} from '@dxos/aurora';
import { useTextModel } from '@dxos/aurora-composer';
import { descriptionText, getSize, mx, osTx } from '@dxos/aurora-theme';
import { ShellLayout } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { Surface, findPlugin, usePluginContext } from '@dxos/react-surface';

import { useDocGhId } from '../../hooks';
import { EditorViewState } from '../../props';
import {
  DocumentResolverProvider,
  DocumentResolverContext,
  ResolverDialog,
  SpaceResolverProvider,
  SpaceResolverContext,
} from '../GithubEchoResolverProviders';
import { GfmPreview } from './GfmPreview';
import './embedded.css';

const overlayAttrs = { side: 'top' as const, sideOffset: 4 };

const EmbeddedLayoutImpl = () => {
  const identity = useIdentity();
  const { t } = useTranslation('dxos:github');
  const { space, source, id, identityHex } = useContext(SpaceResolverContext);
  const { document } = useContext(DocumentResolverContext);
  const { plugins } = usePluginContext();
  const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos:client');

  const handleCloseEmbed = useCallback(() => {
    window.parent.postMessage({ type: 'close-embed' }, 'https://github.com');
  }, []);

  const handleSaveAndCloseEmbed = useCallback(() => {
    document && window.parent.postMessage({ type: 'save-data', content: document.content.text }, 'https://github.com');
  }, [document]);

  const handleInvite = useCallback(() => {
    void clientPlugin?.provides.setLayout(ShellLayout.SPACE_INVITATIONS, space?.key && { spaceKey: space.key });
  }, [clientPlugin, space]);

  const [editorViewState, setEditorViewState] = useState<EditorViewState>('editor');
  const isPreviewing = editorViewState === 'preview';

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [resolverDialogOpen, setResolverDialogOpen] = useState(false);

  const spaceJdenticon = useJdenticonHref(space?.key.toHex() ?? '', 6);

  const textModel = useTextModel({
    identity,
    space: space ?? undefined,
    text: document ? document.content : undefined,
  });

  const docGhId = useDocGhId(document?.meta?.keys ?? []);
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
                    <span className='grow'>{t('open in composer label', { ns: 'composer' })}</span>
                  </a>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.GroupLabel>
                  {t('active space label', { ns: 'composer' })}
                  <Avatar.Root size={5} variant='circle'>
                    <div role='none' className='flex gap-1 mlb-1 items-center'>
                      <Avatar.Frame>
                        <Avatar.Fallback href={spaceJdenticon} />
                      </Avatar.Frame>
                      <Avatar.Label classNames='text-sm text-[--surface-text]'>
                        {Array.isArray(name) ? t(...name) : name}
                      </Avatar.Label>
                    </div>
                  </Avatar.Root>
                </DropdownMenu.GroupLabel>
                <DropdownMenu.Item onClick={() => setRenameDialogOpen(true)}>
                  <span className='grow'>{t('rename space label', { ns: 'composer' })}</span>
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
                    <p className={descriptionText}>{t('save and close description')}</p>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={handleCloseEmbed} classNames='block'>
                    <p>{t('close label', { ns: 'appkit' })}</p>
                    <p className={descriptionText}>{t('close embed description')}</p>
                  </DropdownMenu.Item>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </ButtonGroup>
        </div>
        {space && document ? (
          editorViewState === 'preview' ? (
            <Main.Content classNames='min-bs-[100vh] flex flex-col p-0.5'>
              <GfmPreview
                markdown={document.content?.toString() ?? ''}
                {...(docGhId && { owner: docGhId.owner, repo: docGhId.repo })}
              />
            </Main.Content>
          ) : (
            <Surface role='main' data={{ composer: textModel, properties: document, view: 'embedded' }} />
          )
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
                <ResolverDialog clientPlugin={clientPlugin} />
              </div>
            </div>
          </Dialog.Root>
        ) : null}
        {space && (
          <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <Dialog.Overlay classNames='backdrop-blur'>
              <Dialog.Content>
                <Surface role='dialog' data={['dxos:space/RenameSpaceDialog', space]} />
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Root>
        )}
        <Dialog.Root open={resolverDialogOpen} onOpenChange={setResolverDialogOpen}>
          <Dialog.Overlay classNames='backdrop-blur'>
            <Dialog.Content>
              <ResolverDialog clientPlugin={clientPlugin} />
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
