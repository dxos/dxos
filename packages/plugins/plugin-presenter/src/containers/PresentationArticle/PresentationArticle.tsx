//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { useAttention } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Deck, LayoutPicker, SectionPicker } from '#components';
import { useIsPresenting, usePresentationDeck, usePresentedSlides, useSetPresenting, useSlideIndex } from '#hooks';
import { type LayoutName, applyEdit, isHiddenSlide, setFrontmatter } from '#markdown';
import { meta } from '#meta';
import { Presentation } from '#types';

/** Content of a slide created from the toolbar, with its `layout:` unless that is the default. */
const newSlideContent = (layout: LayoutName = 'default'): string =>
  layout === 'default' ? '# New slide' : `---\nlayout: ${layout}\n---\n\n# New slide`;

export type PresentationArticleProps = AppSurface.ObjectArticleProps<Presentation.Presentation>;

/**
 * A presentation's slides as a grid, presented fullscreen in place; the current slide is per-viewer view state.
 */
export const PresentationArticle = ({ role, subject, attendableId }: PresentationArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const slides = usePresentationDeck(subject);
  const [theme] = useObject(subject, 'theme');
  const [index, setIndex] = useSlideIndex(Obj.getURI(subject), slides.length);
  const fullscreen = useIsPresenting(subject);
  // Presenting leaves out hidden slides; the stored index stays a position in the whole deck, as the grid shows it.
  const presented = usePresentedSlides(subject);
  const presentedIndex = useMemo(() => {
    const ids = new Set(presented.map((slide) => slide.id));
    const next = slides.slice(index).find((slide) => ids.has(slide.id));
    return next ? presented.findIndex((slide) => slide.id === next.id) : presented.length - 1;
  }, [presented, slides, index]);
  const handlePresentedIndexChange = useCallback(
    (next: number) => setIndex(slides.findIndex((slide) => slide.id === presented[next]?.id)),
    [presented, slides, setIndex],
  );
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
    setIndex(slides.length);
    openSection(text.id);
  }, [subject, newSlideLayout, slides.length, setIndex, openSection]);

  // A slide of the presentation's own is deleted as the navtree deletes it (undoable); a linked object is only unlinked.
  const handleDeleteSlide = useCallback(
    (slideIndex: number) => {
      const slide = slides[slideIndex];
      if (slide?.kind === 'text') {
        void invokePromise(
          SpaceOperation.RemoveObjects,
          { objects: [slide.text] },
          { spaceId: Obj.getDatabase(slide.text)?.spaceId },
        );
      } else if (slide?.kind === 'object') {
        Presentation.remove(subject, slide.object);
      }
    },
    [invokePromise, slides, subject],
  );

  const handleToggleHidden = useCallback(
    (slideIndex: number) => {
      const slide = slides[slideIndex];
      if (slide?.kind !== 'text') {
        return;
      }
      const content = slide.text.content;
      const next = applyEdit(content, setFrontmatter(content, { hide: isHiddenSlide(content) ? undefined : true }));
      Obj.update(slide.text, (text) => {
        text.content = next;
      });
    },
    [slides],
  );

  const handleMoveSlide = useCallback(
    (from: number, to: number) => {
      Presentation.move(subject, from, to);
    },
    [subject],
  );

  return (
    <Deck.Root
      slides={fullscreen ? presented : slides}
      index={fullscreen ? presentedIndex : index}
      onIndexChange={fullscreen ? handlePresentedIndexChange : setIndex}
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
                {/* A split button: the plus adds a slide, the caret picks the layout it adds. */}
                <Button.Group compact>
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
                </Button.Group>
                <SectionPicker presentation={subject} />
                <div className='grow' />
                <Deck.PlayButton />
              </Toolbar.Root>
            </Panel.Header>
          )}
          {/* Inline, the article is the grid of slides, ending in a ghost tile that adds one; presenting shows one slide. */}
          <Panel.Body asChild>
            {fullscreen ? (
              <Deck.Viewport />
            ) : (
              <Deck.Grid
                onMove={handleMoveSlide}
                onOpen={handleOpenSlide}
                onAddSlide={handleAddSlide}
                onDeleteSlide={handleDeleteSlide}
                onToggleHidden={handleToggleHidden}
              />
            )}
          </Panel.Body>
        </Deck.Content>
      </Panel.Root>
    </Deck.Root>
  );
};

PresentationArticle.displayName = 'PresentationArticle';
