//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { type PropsWithChildren, useMemo } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { createContext } from '@dxos/react-hooks';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Util from '@dxos/react-ui/Util';
import { type Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { useSlideImage } from '#hooks';
import { meta } from '#meta';
import { type Presentation } from '#types';

import { MarkdownSlide, type MarkdownSlideProps } from '../MarkdownSlide/index.ts';
import { SlideThemeScope } from '../SlideTheme/index.ts';
import { SlideCanvas } from './canvas.tsx';
import { EmbedAncestor, EmbeddedSurface } from './EmbeddedSurface.tsx';
import { ObjectSurface } from './ObjectSurface.tsx';

// TODO(burdon): Factor the Deck and Slide families out to a react-ui-presenter package.

/** Options for markdown slides: click step (default: all revealed), the outlined slot, and source clicks. */
type MarkdownOptions = Pick<MarkdownSlideProps, 'step' | 'activeSlot' | 'onSourceClick'>;

//
// Root
//

type SlideContextValue = MarkdownOptions & {
  source: SlideSource;
  attendableId?: string;
};

const SLIDE_NAME = 'Slide';

const [SlideProvider, useSlideContext] = createContext<SlideContextValue>(SLIDE_NAME);

type SlideRootProps = PropsWithChildren<SlideContextValue>;

/**
 * One slide, whatever its source: owned markdown, a markdown string, a linked object, or one still loading. Headless:
 * it renders only its parts, typically `Slide.Frame` around `Slide.Content`.
 */
const SlideRoot = ({ children, ...context }: SlideRootProps) => <SlideProvider {...context}>{children}</SlideProvider>;

SlideRoot.displayName = 'Slide.Root';

//
// Frame
//

type SlideFrameProps = Util.ThemedClassName<
  PropsWithChildren<{
    /** Inset the slide in a solid void with rounded corners, so its own background reads as distinct. */
    inset?: boolean;
    /** Scale the canvas to fit (default); print lays it out at its nominal size instead. */
    scaled?: boolean;
  }>
>;

/**
 * The 16:9 slide canvas, scaled to fit its container.
 */
const SlideFrame = ({ children, classNames, inset, scaled = true }: SlideFrameProps) =>
  scaled ? (
    <SlideCanvas inset={inset} classNames={classNames}>
      {children}
    </SlideCanvas>
  ) : (
    <div className='flex relative size-full'>{children}</div>
  );

SlideFrame.displayName = 'Slide.Frame';

//
// Content
//

/**
 * Draws the slide's source: markdown in the Slidev subset, a linked object's `slide` surface, or a pending placeholder.
 */
const SlideContent = () => {
  const { source, attendableId, ...options } = useSlideContext(SlideContent.displayName);
  switch (source.kind) {
    // The slide's own object counts as an ancestor, so a slide that embeds itself stops at one level.
    case 'text':
      return (
        <EmbedAncestor id={source.text.id}>
          <TextContent text={source.text} slide={source.slide} {...options} />
        </EmbedAncestor>
      );
    case 'markdown':
      return <MarkdownContent content={source.content} db={source.db} {...options} />;
    case 'object':
      return (
        <EmbedAncestor id={source.object.id}>
          <SlideThemeScope>
            <ObjectSurface object={source.object} role='slide' attendableId={attendableId} />
          </SlideThemeScope>
        </EmbedAncestor>
      );
    case 'pending':
      return <PendingContent />;
  }
};

SlideContent.displayName = 'Slide.Content';

const TextContent = ({
  text,
  slide,
  ...options
}: { text: Text.Text; slide?: Presentation.Slide } & MarkdownOptions) => {
  const [content] = useObject(text, 'content');
  const image = useSlideImage(slide);
  // Refs resolve against the owner's database so space-relative `echo:///<id>` refs find their target.
  return <MarkdownContent content={content} db={Obj.getDatabase(text)} image={image} {...options} />;
};

const MarkdownContent = ({
  content,
  db,
  image,
  ...options
}: { content: string | undefined; db?: Database.Database; image?: string } & MarkdownOptions) => {
  const renderSurface = useSurfaceRenderer(db);
  return <MarkdownSlide content={content ?? ''} renderSurface={renderSurface} image={image} {...options} />;
};

const PendingContent = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <SlideThemeScope classNames='items-center justify-center gap-6 text-6xl'>
      <Icon.Icon icon='ph--circle-notch--regular' spin classNames='size-16' />
      <span>{t('slide-pending.label')}</span>
    </SlideThemeScope>
  );
};

/**
 * Renders a slide's embedded `<Surface>`s against the owner's database; without one they stay placeholders.
 */
const useSurfaceRenderer = (db: Database.Database | undefined): MarkdownSlideProps['renderSurface'] =>
  useMemo<MarkdownSlideProps['renderSurface']>(
    () => (db ? ({ uri, role }) => <EmbeddedSurface uri={uri} role={role} db={db} /> : undefined),
    [db],
  );

//
// Exports
//

export { SlideContent as Content, SlideFrame as Frame, SlideRoot as Root, useSlideContext, useSurfaceRenderer };

export type { SlideFrameProps as FrameProps, SlideRootProps as RootProps };
