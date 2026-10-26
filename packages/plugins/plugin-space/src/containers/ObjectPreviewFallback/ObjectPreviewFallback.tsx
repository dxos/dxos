//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Obj } from '@dxos/echo';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';

import { getSharePreviewHeading } from '../../util/index.ts';

export type ObjectPreviewFallbackProps = Pick<AppSurface.ObjectPreviewData<Obj.Unknown>, 'subject'>;

/** A preview for a type that offers none of its own: what the object is called, while it opens. */
export const ObjectPreviewFallback = ({ subject }: ObjectPreviewFallbackProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const types = Hooks.useCapabilities(AppCapabilities.Schema);
  const heading = useMemo(() => getSharePreviewHeading(subject, types.flat()), [subject, types]);
  return (
    <Layout.Flex column center gap='sm' classNames='h-full' role='status' data-testid='space.objectPreview'>
      <span className='text-lg'>{heading?.label ?? t('object-preview.untitled')}</span>
      <span className='text-fg-subtle'>{t('share-link-opening.title')}</span>
    </Layout.Flex>
  );
};

ObjectPreviewFallback.displayName = 'ObjectPreviewFallback';
