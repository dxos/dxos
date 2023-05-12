//
// Copyright 2023 DXOS.org
//
import '../embedded.css';

import React, { useCallback, useContext } from 'react';
import { Outlet } from 'react-router-dom';

import { Button, ButtonGroup, useTranslation } from '@dxos/aurora';

import {
  ResolverDialog,
  DocumentResolverContext,
  DocumentResolverProvider,
  SpaceResolverContext,
  SpaceResolverProvider
} from '../components';
import { EmbeddedFirstRunPage } from '../pages';
import type { OutletContext } from './OutletContext';

const EmbeddedLayoutImpl = () => {
  const { t } = useTranslation('composer');
  const { space, source, id, identityHex } = useContext(SpaceResolverContext);
  const { document } = useContext(DocumentResolverContext);

  const handleCloseEmbed = useCallback(() => {
    window.parent.postMessage({ type: 'close-embed' }, '*');
  }, []);

  const handleSaveAndCloseEmbed = useCallback(() => {
    document && window.parent.postMessage({ type: 'save-data', content: document.content.text }, 'https://github.com');
  }, [document]);

  return (
    <>
      {space && document ? (
        <Outlet context={{ space, document, layout: 'embedded' } as OutletContext} />
      ) : source && id && identityHex ? (
        <ResolverDialog />
      ) : (
        <EmbeddedFirstRunPage />
      )}
      <ButtonGroup className='fixed inline-end-2 block-end-2 z-[70]'>
        <Button onClick={handleCloseEmbed}>{t('close label', { ns: 'appkit' })}</Button>
        <Button onClick={handleSaveAndCloseEmbed}>{t('save and close label')}</Button>
      </ButtonGroup>
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
