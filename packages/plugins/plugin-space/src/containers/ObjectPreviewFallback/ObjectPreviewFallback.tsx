//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';

export type ObjectPreviewFallbackProps = Pick<AppSurface.ObjectPreviewData<Obj.Unknown>, 'subject'>;

/** A preview for a type that offers none of its own: what the object is called, while it opens. */
export const ObjectPreviewFallback = ({ subject }: ObjectPreviewFallbackProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex column center gap='sm' classNames='h-full' role='status' data-testid='space.objectPreview'>
      <span className='text-lg'>{Obj.getLabel(subject) ?? t('object-preview.untitled')}</span>
      <span className='text-fg-subtle'>{t('share-link-opening.title')}</span>
    </Layout.Flex>
  );
};

ObjectPreviewFallback.displayName = 'ObjectPreviewFallback';
