//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type Database, Obj } from '@dxos/echo';
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
  /** Click step for text slides (default: all revealed). */
  step?: number;
};

/**
 * Renders one deck slide inside its scaled frame, whatever the slide's source.
 */
export const SlideRenderer = ({ source, attendableId, step }: SlideRendererProps) => {
  switch (source.kind) {
    case 'text':
      return <TextSlide text={source.text} step={step} />;
    case 'markdown':
      return <MarkdownContentSlide content={source.content} db={source.db} step={step} />;
    case 'object':
      return <ObjectSlide object={source.object} attendableId={attendableId} />;
    case 'pending':
      return <PendingSlide />;
  }
};

const TextSlide = ({ text, step }: { text: Text.Text } & Pick<SlideRendererProps, 'step'>) => {
  const [content] = useObject(text, 'content');
  // Refs resolve against the owner's database so space-relative `echo:///<id>` refs find their target.
  return <MarkdownContentSlide content={content} db={Obj.getDatabase(text)} step={step} />;
};

const MarkdownContentSlide = ({
  content,
  db,
  step,
}: { content: string | undefined; db?: Database.Database } & Pick<SlideRendererProps, 'step'>) => {
  const renderSurface = useMemo<MarkdownSlideProps['renderSurface']>(
    () => (db ? ({ uri, role }) => <EmbeddedSurface uri={uri} role={role} db={db} /> : undefined),
    [db],
  );
  return (
    <SlideFrame>
      <MarkdownSlide content={content ?? ''} step={step} renderSurface={renderSurface} />
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
