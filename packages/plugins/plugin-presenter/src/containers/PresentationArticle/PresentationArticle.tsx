//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useAttention } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Deck, LayoutPicker, SectionPicker } from '#components';
import { type SlideSource } from '#deck';
import {
  useGridSize,
  useIsPresenting,
  usePresentationDeck,
  usePresentedIndex,
  usePresentedPositions,
  useSetPresenting,
  useSlideIndex,
} from '#hooks';
import { type LayoutName } from '#markdown';
import { Presentation, PresenterSurface } from '#types';

import { PresenterNamespace } from '../../namespace.ts';
import PresentedOverlay from '../PresentedOverlay/index.ts';

/** Content of a slide created from the toolbar, with its `layout:` unless that is the default. */
const newSlideContent = (layout: LayoutName = 'default'): string =>
  layout === 'default' ? '# New slide' : `---\nlayout: ${layout}\n---\n\n# New slide`;

export type PresentationArticleProps = AppSurface.ObjectArticleProps<Presentation.Presentation>;

/**
 * A presentation's slides as a grid, presented fullscreen in place; the current slide is per-viewer view state.
 */
export const PresentationArticle = ({ role, subject, attendableId }: PresentationArticleProps) => {
  const { t } = Hooks.useTranslation(PresenterNamespace.key);
  const slides = usePresentationDeck(subject);
  const [theme] = useObject(subject, 'theme');
  const [index, setIndex] = useSlideIndex(Obj.getURI(subject), slides.length);
  const [gridSize, setGridSize] = useGridSize(Obj.getURI(subject));
  const fullscreen = useIsPresenting(subject);
  // Presenting leaves out hidden slides; the stored index stays a position in the whole deck, as the grid shows it.
  // Positions, not ids: an object linked twice yields two slides with one id.
  const positions = usePresentedPositions(subject);
  const presented = usePresentedIndex(slides, positions, index, setIndex);
  const setPresenting = useSetPresenting(subject);
  // Only the attended article takes focus, so opening one unattended (or a reload) leaves the caret where it is.
  const { hasAttention } = useAttention(attendableId);

  const handleFullscreenChange = useCallback(
    (next: boolean) => {
      void setPresenting(next);
    },
    [setPresenting],
  );

  const { invokePromise } = AppHooks.useOperationInvoker();

  // The caret of the add button picks the layout every later add uses.
  const [newSlideLayout, setNewSlideLayout] = useState<LayoutName>('default');
  /** Opens a section in its own editor (a slide's, or the linked object's article). */
  const openSection = useCallback(
    (id: string) => {
      const db = Obj.getDatabase(subject);
      if (!db) {
        return;
      }
      void invokePromise(LayoutOperation.Open, {
        subject: [GraphPath.getCollectionObjectPath(GraphPath.getObjectPathFromObject(subject), id)],
        workspace: GraphPath.getSpacePath(db.spaceId),
      });
    },
    [invokePromise, subject],
  );

  const handleOpenSlide = useCallback(
    (slideIndex: number) => {
      const slide = slides[slideIndex];
      if (slide) {
        openSection(slide.id);
      }
    },
    [slides, openSection],
  );

  // A new slide is added last, made current and opened for editing.
  const handleAddSlide = useCallback(() => {
    const text = Presentation.addSlide(subject, newSlideContent(newSlideLayout));
    setIndex(slides.length, slides.length + 1);
    openSection(text.id);
  }, [subject, newSlideLayout, slides.length, setIndex, openSection]);

  // Each tile opens its slide's node's actions (the navtree's, e.g. delete and hide) as the app's context menu.
  const contextMenuId = useCallback(
    (slide: SlideSource) => GraphPath.getCollectionObjectPath(GraphPath.getObjectPathFromObject(subject), slide.id),
    [subject],
  );

  const handleMoveSlide = useCallback(
    (from: number, to: number) => {
      Presentation.move(subject, from, to);
    },
    [subject],
  );

  return (
    <Deck.Root
      slides={fullscreen ? presented.slides : slides}
      index={fullscreen ? presented.index : index}
      onIndexChange={fullscreen ? presented.onIndexChange : setIndex}
      fullscreen={fullscreen}
      onFullscreenChange={handleFullscreenChange}
      attendableId={attendableId}
      autoFocus={hasAttention}
      theme={theme}
    >
      <Panel.Root role={role} asChild>
        <Deck.Content>
          {!fullscreen && (
            <Panel.Header>
              <Toolbar.Root>
                {/* A split button (the caret picks the layout the plus adds), unwrapped so the toolbar sees an icon button first. */}
                <Button.Root
                  data-testid='presenter.add-slide'
                  icon='ph--plus--regular'
                  iconOnly
                  variant='ghost'
                  label={t('add-slide.label')}
                  onClick={handleAddSlide}
                />
                <LayoutPicker
                  value={newSlideLayout}
                  onChange={setNewSlideLayout}
                  trigger={
                    <Button.Root
                      data-testid='presenter.add-slide.layout'
                      icon='ph--caret-down--regular'
                      iconOnly
                      variant='ghost'
                      label={t('add-slide-layout.label')}
                    />
                  }
                />

                <SectionPicker presentation={subject} />
                <div className='grow' />
                <Surface.Surface type={PresenterSurface.Toolbar} data={{ subject }} />
                <Button.Root
                  data-testid='presenter.grid-size'
                  icon={gridSize === 'large' ? 'ph--grid-four--regular' : 'ph--grid-nine--regular'}
                  iconOnly
                  variant='ghost'
                  label={t(gridSize === 'large' ? 'grid-size-small.label' : 'grid-size-large.label')}
                  onClick={() => setGridSize(gridSize === 'large' ? 'small' : 'large')}
                />
                <Deck.PlayButton />
              </Toolbar.Root>
            </Panel.Header>
          )}
          {/* Inline, the article is the grid of slides, ending in a ghost tile that adds one; presenting shows one slide. */}
          <Panel.Body asChild>
            {fullscreen ? (
              <Deck.Viewport>
                <PresentedOverlay presentation={subject} />
              </Deck.Viewport>
            ) : (
              <Deck.Grid
                size={gridSize}
                onMove={handleMoveSlide}
                onOpen={handleOpenSlide}
                onAddSlide={handleAddSlide}
                contextMenuId={contextMenuId}
              />
            )}
          </Panel.Body>
        </Deck.Content>
      </Panel.Root>
    </Deck.Root>
  );
};

PresentationArticle.displayName = 'PresentationArticle';
