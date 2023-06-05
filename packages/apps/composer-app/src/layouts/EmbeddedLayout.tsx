//
// Copyright 2023 DXOS.org
//
import '../embedded.css';

import { ArrowSquareOut, CaretDown, DotsThreeVertical, Eye, Option, UserPlus } from '@phosphor-icons/react';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Button, ButtonGroup, DensityProvider, Toggle, useTranslation, DropdownMenu, Tooltip } from '@dxos/aurora';
import { defaultDescription, getSize, mx } from '@dxos/aurora-theme';
import { ShellLayout } from '@dxos/client';
import { useShell } from '@dxos/react-shell';

import {
  ResolverDialog,
  DocumentResolverContext,
  DocumentResolverProvider,
  SpaceResolverContext,
  SpaceResolverProvider,
  OctokitProvider,
} from '../components';
import { EmbeddedFirstRunPage } from '../pages';
import { abbreviateKey } from '../router';
import { unbindSpace } from '../util';
import type { EditorViewState, OutletContext } from './OutletContext';

const overlayAttrs = { side: 'top' as const, sideOffset: 4 };

const EmbeddedLayoutImpl = () => {
  const { t } = useTranslation('composer');
  const { space, source, id, identityHex, setSpace } = useContext(SpaceResolverContext);
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

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOpetionsMenuOpen] = useState(false);

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
        <div role='none' className='fixed inline-end-2 block-end-2 z-[70] flex gap-2'>
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
                pressed={editorViewState === 'preview'}
                onPressedChange={(nextPressed) => setEditorViewState(nextPressed ? 'preview' : 'editor')}
              >
                <span className='sr-only'>{t('preview gfm label')}</span>
                <Eye className={getSize(5)} />
              </Toggle>
            </Tooltip.Trigger>
            <Tooltip.Content {...overlayAttrs}>
              {t('preview gfm label')}
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
                open: optionsMenuOpen,
                onOpenChange: (nextOpen: boolean) => {
                  if (!nextOpen) {
                    suppressNextTooltip.current = true;
                  }
                  return setOpetionsMenuOpen(nextOpen);
                },
              }}
            >
              <Tooltip.Trigger asChild>
                <DropdownMenu.Trigger asChild>
                  <Button disabled={!(space && document)}>
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
                    href={space && document ? `${location.origin}/${abbreviateKey(space?.key)}/${document.id}` : '#'}
                  >
                    <span className='grow'>{t('open in composer label')}</span>
                    <ArrowSquareOut className={mx('shrink-0', getSize(5))} />
                  </a>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => {
                    if (space && identityHex && source && id) {
                      unbindSpace(space, identityHex, source, id);
                      setSpace(null);
                    }
                  }}
                >
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
              <DropdownMenu.Trigger asChild>
                <Button disabled={!(space && document)}>
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
          <Outlet
            context={{ space, document, layout: 'embedded', editorViewState, setEditorViewState } as OutletContext}
          />
        ) : source && id && identityHex ? (
          <ResolverDialog />
        ) : (
          <EmbeddedFirstRunPage />
        )}
      </DensityProvider>
    </>
  );
};

export const EmbeddedLayout = () => {
  return (
    <OctokitProvider>
      <SpaceResolverProvider>
        <DocumentResolverProvider>
          <EmbeddedLayoutImpl />
        </DocumentResolverProvider>
      </SpaceResolverProvider>
    </OctokitProvider>
  );
};
