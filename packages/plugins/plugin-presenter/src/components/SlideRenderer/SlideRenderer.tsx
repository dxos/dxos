//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { type Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { meta } from '#meta';

import { MarkdownSlide, type MarkdownSlideProps } from '../MarkdownSlide/index.ts';
import { SlideFrame } from '../SlideFrame/index.ts';
import { EmbeddedSurface } from './EmbeddedSurface.tsx';
import { ObjectSurface } from './ObjectSurface.tsx';

export type SlideRendererProps = {
  source: SlideSource;
  attendableId?: string;
};

/**
 * Renders one deck slide inside its scaled frame, whatever the slide's source.
 */
export const SlideRenderer = ({ source, attendableId }: SlideRendererProps) => {
  switch (source.kind) {
    case 'text':
      return <TextSlide text={source.text} />;
    case 'object':
      return <ObjectSlide object={source.object} attendableId={attendableId} />;
    case 'pending':
      return <PendingSlide />;
  }
};

const TextSlide = ({ text }: { text: Text.Text }) => {
  const [content] = useObject(text, 'content');
  // Refs resolve against the owner's database so space-relative `echo:///<id>` refs find their target.
  const db = Obj.getDatabase(text);
  const renderSurface = useMemo<MarkdownSlideProps['renderSurface']>(
    () => (db ? ({ uri, role }) => <EmbeddedSurface uri={uri} role={role} db={db} /> : undefined),
    [db],
  );
  return (
    <SlideFrame>
      <MarkdownSlide content={content} renderSurface={renderSurface} />
    </SlideFrame>
  );
};

const ObjectSlide = ({ object, attendableId }: { object: Obj.Unknown; attendableId?: string }) => (
  <SlideFrame>
    <ObjectSurface object={object} role='slide' attendableId={attendableId} />
  </SlideFrame>
);

const PendingSlide = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <SlideFrame>
      <div className='flex grow h-full items-center justify-center gap-6 text-6xl'>
        <Icon.Icon icon='ph--circle-notch--regular' spin classNames='size-16' />
        <span>{t('slide-pending.label')}</span>
      </div>
    </SlideFrame>
  );
};
