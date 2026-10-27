//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { type Space } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Presentation } from '#types';

import { PresentationArticle } from '../containers/PresentationArticle/PresentationArticle.tsx';
import { createPresenterStoryPlugin } from './presenterStoryPlugin.ts';

/** Attended from the start (see `withAttention` below), as a plank the user just opened. */
export const ATTENDED_ID = 'story';

/** Renders the first presentation in the story space as an attended article. */
export const PresentationStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const attributes = useAttentionAttributes(ATTENDED_ID);
  if (!presentation) {
    return <Loading />;
  }

  return (
    <div {...attributes} className='contents'>
      <PresentationArticle role='article' attendableId={ATTENDED_ID} subject={presentation} />
    </div>
  );
};

export const presentationStoryParameters = {
  layout: 'fullscreen',
  translations: [...translations, ...reactUiTranslations, ...formTranslations],
};

/** Decorators shared by the PresentationArticle stories. */
export const presentationStoryDecorators = ({
  onCreateSpace,
  slideSurface,
}: {
  onCreateSpace: (props: { space: Space }) => Promise<void>;
  slideSurface?: boolean;
}) => [
  withTheme(),
  withLayout({ layout: 'fullscreen' }),
  withClientProvider({
    types: [Presentation.Presentation, Presentation.Slide, Text.Text, Markdown.Document],
    createIdentity: true,
    createSpace: true,
    onCreateSpace,
  }),
  withPluginManager({ plugins: [ProcessManagerPlugin.make(), createPresenterStoryPlugin({ slideSurface })()] }),
  // Outermost, so the plugin manager's atom registry is not replaced by the decorator's own.
  withAttention(ATTENDED_ID),
];
