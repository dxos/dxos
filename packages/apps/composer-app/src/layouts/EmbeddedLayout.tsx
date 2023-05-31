//
// Copyright 2023 DXOS.org
//
import '../embedded.css';

import { ArrowSquareOut, CaretDown, Eye } from '@phosphor-icons/react';
import React, { useCallback, useContext, useState } from 'react';
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
} from '@dxos/aurora';
import { defaultDescription, getSize } from '@dxos/aurora-theme';
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
import type { EditorViewState, OutletContext } from './OutletContext';

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

  return (
    <DensityProvider density='fine'>
      <div role='none' className='fixed inline-end-2 block-end-2 z-[70] flex gap-2'>
        <Button disabled={!space} onClick={handleInvite}>
          {t('create invitation label', { ns: 'appkit' })}
        </Button>
        <Button disabled={!(space && document)} asChild>
          <a
            target='_blank'
            rel='noreferrer'
            href={space && document ? `${location.origin}/${abbreviateKey(space?.key)}/${document.id}` : '#'}
          >
            <span className='sr-only'>{t('open in composer label')}</span>
            <ArrowSquareOut className={getSize(5)} />
          </a>
        </Button>
        <Toggle
          disabled={!(space && document)}
          pressed={editorViewState === 'preview'}
          onPressedChange={(nextPressed) => setEditorViewState(nextPressed ? 'preview' : 'editor')}
        >
          <span className='sr-only'>{t('open in composer label')}</span>
          <Eye className={getSize(5)} />
        </Toggle>
        <ButtonGroup>
          <Button disabled={!(space && document)} onClick={handleSaveAndCloseEmbed}>
            {t('save and close label')}
          </Button>
          <DropdownMenuRoot>
            <DropdownMenuTrigger asChild>
              <Button>
                <CaretDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
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
