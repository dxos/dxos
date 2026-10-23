//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type PropsWithChildren, useMemo } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { type Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { meta } from '#meta';

import { MarkdownSlide, type MarkdownSlideProps } from '../MarkdownSlide/index.ts';
import { SlideFrame } from '../SlideFrame/index.ts';
import { SlideThemeScope } from '../SlideTheme/index.ts';
import { EmbedAncestor, EmbeddedSurface } from './EmbeddedSurface.tsx';
import { ObjectSurface } from './ObjectSurface.tsx';

export type SlideRendererProps = {
  source: SlideSource;
  attendableId?: string;
  /** Click step for text slides (default: all revealed). */
  step?: number;
  /** Wrap the slide in the scaled `SlideFrame` (default); print renders it unscaled at canvas size. */
  framed?: boolean;
};

type FrameProps = { Frame: ComponentType<PropsWithChildren> };

/** Frame for print: the slide at its nominal canvas size, with no scaling to measure. */
const PrintFrame = ({ children }: PropsWithChildren) => <div className='flex relative size-full'>{children}</div>;

/**
 * Renders one deck slide inside its scaled frame, whatever the slide's source.
 */
export const SlideRenderer = ({ source, attendableId, step, framed = true }: SlideRendererProps) => {
  const Frame = framed ? SlideFrame : PrintFrame;
  switch (source.kind) {
    // The slide's own object counts as an ancestor, so a slide that embeds itself stops at one level.
    case 'text':
      return (
        <EmbedAncestor id={source.text.id}>
          <TextSlide Frame={Frame} text={source.text} step={step} />
        </EmbedAncestor>
      );
    case 'markdown':
      return <MarkdownContentSlide Frame={Frame} content={source.content} db={source.db} step={step} />;
    case 'object':
      return (
        <EmbedAncestor id={source.object.id}>
          <ObjectSlide Frame={Frame} object={source.object} attendableId={attendableId} />
        </EmbedAncestor>
      );
    case 'pending':
      return <PendingSlide Frame={Frame} />;
  }
};

const TextSlide = ({ Frame, text, step }: FrameProps & { text: Text.Text } & Pick<SlideRendererProps, 'step'>) => {
  const [content] = useObject(text, 'content');
  // Refs resolve against the owner's database so space-relative `echo:///<id>` refs find their target.
  return <MarkdownContentSlide Frame={Frame} content={content} db={Obj.getDatabase(text)} step={step} />;
};

const MarkdownContentSlide = ({
  Frame,
  content,
  db,
  step,
}: FrameProps & { content: string | undefined; db?: Database.Database } & Pick<SlideRendererProps, 'step'>) => {
  const renderSurface = useSurfaceRenderer(db);
  return (
    <Frame>
      <MarkdownSlide content={content ?? ''} step={step} renderSurface={renderSurface} />
    </Frame>
  );
};

/**
 * Renders a slide's embedded `<Surface>`s against the owner's database; without one they stay placeholders.
 */
export const useSurfaceRenderer = (db: Database.Database | undefined): MarkdownSlideProps['renderSurface'] =>
  useMemo<MarkdownSlideProps['renderSurface']>(
    () => (db ? ({ uri, role }) => <EmbeddedSurface uri={uri} role={role} db={db} /> : undefined),
    [db],
  );

const ObjectSlide = ({ Frame, object, attendableId }: FrameProps & { object: Obj.Unknown; attendableId?: string }) => (
  <Frame>
    <SlideThemeScope>
      <ObjectSurface object={object} role='slide' attendableId={attendableId} />
    </SlideThemeScope>
  </Frame>
);

const PendingSlide = ({ Frame }: FrameProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Frame>
      <SlideThemeScope classNames='items-center justify-center gap-6 text-6xl'>
        <Icon.Icon icon='ph--circle-notch--regular' spin classNames='size-16' />
        <span>{t('slide-pending.label')}</span>
      </SlideThemeScope>
    </Frame>
  );
};
