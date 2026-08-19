//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { UnsupportedType } from '../../components';
import type { PreviewPluginOptions } from '../../types';

export type UnsupportedTypeArticleProps = AppSurface.ObjectArticleProps<Obj.Unknown> &
  Pick<PreviewPluginOptions, 'extensibleAppUrl'>;

/**
 * Turns the plugin's `extensibleAppUrl` into a link to this same object elsewhere, then renders the
 * inert stand-in. Both builds serve the same routes, so carrying the current path over deep-links to
 * the object; an origin that will not parse degrades to no link rather than a broken one.
 */
export const UnsupportedTypeArticle = ({ role, subject, extensibleAppUrl }: UnsupportedTypeArticleProps) => {
  const href = (() => {
    if (!extensibleAppUrl) {
      return undefined;
    }
    try {
      return new URL(window.location.pathname + window.location.search, extensibleAppUrl).toString();
    } catch {
      return undefined;
    }
  })();

  return <UnsupportedType role={role} typename={Obj.getTypename(subject) ?? ''} href={href} />;
};
