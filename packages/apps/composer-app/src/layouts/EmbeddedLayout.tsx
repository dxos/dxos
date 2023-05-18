//
// Copyright 2023 DXOS.org
//
import '../embedded.css';

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { useCallback, useContext } from 'react';
import { Outlet } from 'react-router-dom';

import { Button, ButtonGroup, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { ShellLayout } from '@dxos/client';
import { useShell } from '@dxos/react-shell';

import {
  ResolverDialog,
  DocumentResolverContext,
  DocumentResolverProvider,
  SpaceResolverContext,
  SpaceResolverProvider,
} from '../components';
import { EmbeddedFirstRunPage } from '../pages';
import { abbreviateKey } from '../router';
import type { OutletContext } from './OutletContext';

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

  return (
    <>
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
        <ButtonGroup>
          <Button onClick={handleCloseEmbed}>{t('close label', { ns: 'appkit' })}</Button>
          <Button disabled={!(space && document)} onClick={handleSaveAndCloseEmbed}>
            {t('save and close label')}
          </Button>
        </ButtonGroup>
      </div>
      {space && document ? (
        <Outlet context={{ space, document, layout: 'embedded' } as OutletContext} />
      ) : source && id && identityHex ? (
        <ResolverDialog />
      ) : (
        <EmbeddedFirstRunPage />
      )}
    </>
  );
};

export const EmbeddedLayout = () => {
  return (
    <SpaceResolverProvider>
      <DocumentResolverProvider>
        <EmbeddedLayoutImpl />
      </DocumentResolverProvider>
    </SpaceResolverProvider>
  );
};
