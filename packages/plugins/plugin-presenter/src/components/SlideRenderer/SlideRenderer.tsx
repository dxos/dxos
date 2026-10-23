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

/** Options for markdown slides: click step (default: all revealed), the outlined slot, and source clicks. */
type MarkdownOptions = Pick<MarkdownSlideProps, 'step' | 'activeSlot' | 'onSourceClick'>;

export type SlideRendererProps = MarkdownOptions & {
  source: SlideSource;
  attendableId?: string;
  /** Wrap the slide in the scaled `SlideFrame` (default); print renders it unscaled at canvas size. */
  framed?: boolean;
  /** Classes for the scaled frame, e.g. to tint the space around the 16:9 slide. */
  frameClassNames?: string;
};

type FrameProps = { Frame: ComponentType<PropsWithChildren> };

/** Frame for print: the slide at its nominal canvas size, with no scaling to measure. */
const PrintFrame = ({ children }: PropsWithChildren) => <div className='flex relative size-full'>{children}</div>;

/**
 * Renders one deck slide inside its scaled frame, whatever the slide's source.
 */
export const SlideRenderer = ({
  source,
  attendableId,
  framed = true,
  frameClassNames,
  ...options
}: SlideRendererProps) => {
  // Memoized so a re-render keeps the same frame component and does not remount the slide.
  const Frame = useMemo<ComponentType<PropsWithChildren>>(
    () =>
      framed
        ? ({ children }: PropsWithChildren) => <SlideFrame classNames={frameClassNames}>{children}</SlideFrame>
        : PrintFrame,
    [framed, frameClassNames],
  );
  switch (source.kind) {
    // The slide's own object counts as an ancestor, so a slide that embeds itself stops at one level.
    case 'text':
      return (
        <EmbedAncestor id={source.text.id}>
          <TextSlide Frame={Frame} text={source.text} {...options} />
        </EmbedAncestor>
      );
    case 'markdown':
      return <MarkdownContentSlide Frame={Frame} content={source.content} db={source.db} {...options} />;
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

const TextSlide = ({ Frame, text, ...options }: FrameProps & { text: Text.Text } & MarkdownOptions) => {
  const [content] = useObject(text, 'content');
  // Refs resolve against the owner's database so space-relative `echo:///<id>` refs find their target.
  return <MarkdownContentSlide Frame={Frame} content={content} db={Obj.getDatabase(text)} {...options} />;
};

const MarkdownContentSlide = ({
  Frame,
  content,
  db,
  ...options
}: FrameProps & { content: string | undefined; db?: Database.Database } & MarkdownOptions) => {
  const renderSurface = useSurfaceRenderer(db);
  return (
    <Frame>
      <MarkdownSlide content={content ?? ''} renderSurface={renderSurface} {...options} />
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
