//
// Copyright 2023 DXOS.org
//
import '../embedded.css';

import { ArrowSquareOut, CaretDown, DotsThreeVertical, Eye, Option, UserPlus } from '@phosphor-icons/react';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';

import {
  Button,
  ButtonGroup,
  DensityProvider,
  Toggle,
  useTranslation,
  DropdownMenuRoot,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuItem,
  DropdownMenuPortal,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
} from '@dxos/aurora';
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
          <TooltipRoot>
            <TooltipTrigger asChild>
              <Button disabled={!space} onClick={handleInvite}>
                <span className='sr-only'>{t('create invitation label', { ns: 'appkit' })}</span>
                <UserPlus className={getSize(5)} />
              </Button>
            </TooltipTrigger>
            <TooltipContent {...overlayAttrs}>
              {t('create invitation label', { ns: 'appkit' })}
              <TooltipArrow />
            </TooltipContent>
          </TooltipRoot>
          <TooltipRoot>
            <TooltipTrigger asChild>
              <Toggle
                disabled={!(space && document)}
                pressed={editorViewState === 'preview'}
                onPressedChange={(nextPressed) => setEditorViewState(nextPressed ? 'preview' : 'editor')}
              >
                <span className='sr-only'>{t('preview gfm label')}</span>
                <Eye className={getSize(5)} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent {...overlayAttrs}>
              {t('preview gfm label')}
              <TooltipArrow />
            </TooltipContent>
          </TooltipRoot>
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
            <DropdownMenuRoot
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
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button disabled={!(space && document)}>
                    <span className='sr-only'>{t('embedded options label')}</span>
                    <DotsThreeVertical className={getSize(5)} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <DropdownMenuContent {...overlayAttrs}>
                <DropdownMenuItem asChild>
                  <a
                    target='_blank'
                    rel='noreferrer'
                    href={space && document ? `${location.origin}/${abbreviateKey(space?.key)}/${document.id}` : '#'}
                  >
                    <span className='grow'>{t('open in composer label')}</span>
                    <ArrowSquareOut className={mx('shrink-0', getSize(5))} />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (space && identityHex && source && id) {
                      unbindSpace(space, identityHex, source, id);
                      setSpace(null);
                    }
                  }}
                >
                  <span className='grow'>{t('unset repo space label')}</span>
                  <Option className={mx('shrink-0', getSize(5))} />
                </DropdownMenuItem>
                <DropdownMenuArrow />
              </DropdownMenuContent>
              <TooltipContent {...overlayAttrs}>
                {t('embedded options label')}
                <TooltipArrow />
              </TooltipContent>
            </DropdownMenuRoot>
          </TooltipRoot>
          <ButtonGroup classNames={[!(space && document) && 'shadow-none']}>
            <Button disabled={!(space && document)} onClick={handleSaveAndCloseEmbed}>
              {t('save and close label')}
            </Button>
            <DropdownMenuRoot>
              <DropdownMenuTrigger asChild>
                <Button disabled={!(space && document)}>
                  <CaretDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent {...overlayAttrs}>
                  <DropdownMenuItem onClick={handleSaveAndCloseEmbed} classNames='block'>
                    <p>{t('save and close label')}</p>
                    <p className={defaultDescription}>{t('save and close description')}</p>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCloseEmbed} classNames='block'>
                    <p>{t('close label', { ns: 'appkit' })}</p>
                    <p className={defaultDescription}>{t('close embed description')}</p>
                  </DropdownMenuItem>
                  <DropdownMenuArrow />
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>
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
