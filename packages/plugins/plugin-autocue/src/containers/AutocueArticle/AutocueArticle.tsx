//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject } from '@dxos/echo-react';
import * as Panel from '@dxos/react-ui/Panel';

import { BundlePlayer } from '#components';
import { type AutocueBundle } from '#types';

export type AutocueArticleProps = AppSurface.ObjectArticleProps<AutocueBundle.AutocueBundle>;

/** Plays the linked autocue bundle; the player brings its own toolbar and companion panel. */
export const AutocueArticle = ({ role, subject }: AutocueArticleProps) => {
  const [bundle] = useObject(subject);
  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <BundlePlayer url={bundle.url} />
      </Panel.Body>
    </Panel.Root>
  );
};
