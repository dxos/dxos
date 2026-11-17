//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import React, { type KeyboardEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { EDITOR_TOOLBAR_INSERT_GROUP } from '@dxos/react-ui-editor';
import { ObjectPicker } from '@dxos/react-ui-form';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type LayoutName, type SlideFrontmatter } from '@dxos/react-ui-slides';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Popover from '@dxos/react-ui/Popover';
import type * as Theme from '@dxos/react-ui/Theme';
import { type ThemedClassName } from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type SlideEditorViewState } from '#types';

import { PresenterNamespace } from '../../namespace.ts';
import { AddSlideButton } from '../AddSlideButton/AddSlideButton.tsx';
import { LayoutPicker } from './LayoutPicker.tsx';

/** Snippets the toolbars insert at the cursor. */
export type SlideInsert = 'click' | 'clicks' | 'column' | 'notes';

/** Frontmatter keys the background popover edits. */
export type BackgroundSettings = Pick<SlideFrontmatter, 'image' | 'backgroundVideo'>;

const label = (key: string): Theme.Label => [key, { ns: PresenterNamespace.key }];

export type SlideToolbarProps = ThemedClassName<{
  layout: LayoutName;
  onLayoutChange: (layout: LayoutName) => void;
  onInsert: (insert: SlideInsert) => void;
  background: BackgroundSettings;
  onBackgroundChange: (background: BackgroundSettings) => void;
  previewMode: SlideEditorViewState.PreviewMode;
  onPreviewModeChange: (mode: SlideEditorViewState.PreviewMode) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onPresent?: () => void;
  /** The layout a slide added from here takes; the split button's caret picks it. */
  newSlideLayout?: LayoutName;
  onNewSlideLayoutChange?: (layout: LayoutName) => void;
  /** Absent for a slide with no presentation to add to. */
  onAddSlide?: () => void;
  /** Absent for a slide with no presentation to go back to. */
  onOpenGallery?: () => void;
}>;

/**
 * Slide-level controls for the slide editor (layout, background, notes, preview and navigation); editing actions join
 * the formatting toolbar below it through {@link useSlideInsertActions}.
 */
export const SlideToolbar = ({
  classNames,
  layout,
  onLayoutChange,
  onInsert,
  background,
  onBackgroundChange,
  previewMode,
  onPreviewModeChange,
  onPrevious,
  onNext,
  onPresent,
  newSlideLayout,
  onNewSlideLayoutChange,
  onAddSlide,
  onOpenGallery,
}: SlideToolbarProps) => {
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'add-slide',
          {
            label: label('add-slide.label'),
            variant: 'custom',
            disabled: !onAddSlide || !onNewSlideLayoutChange,
            render: () =>
              onAddSlide && onNewSlideLayoutChange ? (
                <AddSlideButton layout={newSlideLayout} onLayoutChange={onNewSlideLayoutChange} onAdd={onAddSlide} />
              ) : null,
          },
          () => {},
        )
        .group('slide', { label: label('slide-layout.label') }, (group) =>
          group
            .action(
              'layout',
              {
                label: label('slide-layout.label'),
                variant: 'custom',
                render: () => <LayoutPicker value={layout} onChange={onLayoutChange} />,
              },
              () => {},
            )
            .action(
              'background',
              {
                label: label('slide-background.label'),
                variant: 'custom',
                render: () => <BackgroundPopover value={background} onChange={onBackgroundChange} />,
              },
              () => {},
            )
            .action(
              'notes',
              { label: label('slide-notes.label'), icon: 'ph--note--regular', testId: 'presenter.slide-toolbar.notes' },
              () => onInsert('notes'),
            ),
        )
        .action(
          'preview',
          {
            label: label('preview-split.label'),
            icon: 'ph--square-split-vertical--regular',
            type: 'toggle',
            checked: previewMode === 'split',
            testId: 'presenter.slide-toolbar.split',
            placement: { zone: 'end', collapse: 2 },
          },
          () => onPreviewModeChange(previewMode === 'split' ? 'off' : 'split'),
        )
        .group(
          'navigate',
          {
            label: label('present-from-here.label'),
            icon: 'ph--presentation--regular',
            placement: { zone: 'end', collapse: 1 },
          },
          (group) =>
            group
              .action(
                'gallery',
                {
                  label: label('slide-gallery.label'),
                  icon: 'ph--squares-four--regular',
                  disabled: !onOpenGallery,
                  testId: 'presenter.slide-toolbar.gallery',
                },
                () => onOpenGallery?.(),
              )
              .action(
                'previous',
                {
                  label: label('previous-slide.label'),
                  icon: 'ph--caret-left--regular',
                  disabled: !onPrevious,
                  testId: 'presenter.slide-toolbar.previous',
                },
                () => onPrevious?.(),
              )
              .action(
                'next',
                {
                  label: label('next-slide.label'),
                  icon: 'ph--caret-right--regular',
                  disabled: !onNext,
                  testId: 'presenter.slide-toolbar.next',
                },
                () => onNext?.(),
              )
              .action(
                'present',
                {
                  label: label('present-from-here.label'),
                  icon: 'ph--presentation--regular',
                  disabled: !onPresent,
                  testId: 'presenter.slide-toolbar.present',
                },
                () => onPresent?.(),
              ),
        )
        .build(),
    [
      layout,
      onLayoutChange,
      onInsert,
      background,
      onBackgroundChange,
      previewMode,
      onPreviewModeChange,
      onPrevious,
      onNext,
      onPresent,
      newSlideLayout,
      onNewSlideLayoutChange,
      onAddSlide,
      onOpenGallery,
    ],
  );

  return (
    // The toolbar pads its start when the first control is not a square button (the layout picker has a label);
    // dropped so this row starts where the formatting row below it does.
    <ActionToolbar {...menu} alwaysActive data-testid='presenter.slide-toolbar' classNames={mx('ps-0!', classNames)} />
  );
};

export type SlideInsertActionsProps = {
  onInsert: (insert: SlideInsert) => void;
  /** Whether the layout has a second column, so a column break means something. */
  columns?: boolean;
  /** Objects offered by "Insert object"; requested only while its picker is open. */
  objects?: { id: string; label: string }[];
  onObjectsOpenChange?: (open: boolean) => void;
  onInsertObject?: (id: string) => void;
};

/**
 * Slide editing actions for the formatting toolbar's insert group (`customActions` of `Editor.Toolbar`): reveal steps,
 * a column break and an embedded object.
 */
export const useSlideInsertActions = ({
  onInsert,
  columns,
  objects = [],
  onObjectsOpenChange,
  onInsertObject,
}: SlideInsertActionsProps): Atom.Atom<ActionGraphProps> => {
  const { t } = Hooks.useTranslation(PresenterNamespace.key);
  // The handlers change every render; read through a ref so the graph is rebuilt only when what it shows changes.
  const handlers = useRef({ onInsert, onObjectsOpenChange, onInsertObject });
  useLayoutEffect(() => {
    handlers.current = { onInsert, onObjectsOpenChange, onInsertObject };
  });

  return useMemo(
    () =>
      Atom.make(() =>
        // Ids are prefixed, since they share the editor's graph with its own and other contributors' items.
        MenuBuilder.extend(EDITOR_TOOLBAR_INSERT_GROUP, (group) =>
          group
            .group(
              'slide-reveal',
              {
                label: label('insert-click.label'),
                icon: 'ph--cursor-click--regular',
                iconOnly: true,
                caretDown: false,
                variant: 'dropdownMenu',
                testId: 'presenter.slide-toolbar.click',
              },
              (menu) =>
                menu
                  .action('slide-click', { label: label('insert-click.label'), testId: 'presenter.insert-click' }, () =>
                    handlers.current.onInsert('click'),
                  )
                  .action(
                    'slide-clicks',
                    { label: label('insert-clicks.label'), testId: 'presenter.insert-clicks' },
                    () => handlers.current.onInsert('clicks'),
                  ),
            )
            .action(
              'slide-column',
              {
                label: label('insert-column.label'),
                icon: 'ph--columns--regular',
                disabled: !columns,
                testId: 'presenter.slide-toolbar.column',
              },
              () => handlers.current.onInsert('column'),
            )
            .action(
              'slide-object',
              {
                label: label('insert-object.label'),
                variant: 'custom',
                render: () => (
                  <ObjectPicker
                    options={objects}
                    onOpenChange={(open) => handlers.current.onObjectsOpenChange?.(open)}
                    onSelect={(id) => id && handlers.current.onInsertObject?.(id)}
                    trigger={
                      <Button.Root
                        data-testid='presenter.slide-toolbar.object'
                        icon='ph--squares-four--regular'
                        iconOnly
                        variant='ghost'
                        label={t('insert-object.label')}
                      />
                    }
                  />
                ),
              },
              () => {},
            ),
        ),
      ),
    [columns, objects, t],
  );
};

type BackgroundPopoverProps = { value: BackgroundSettings; onChange: (value: BackgroundSettings) => void };

/** Image and video URL fields for the slide background; each commits on Enter or blur, and empty removes it. */
const BackgroundPopover = ({ value, onChange }: BackgroundPopoverProps) => {
  const { t } = Hooks.useTranslation(PresenterNamespace.key);
  const [image, setImage] = useState(value.image ?? '');
  const [video, setVideo] = useState(value.backgroundVideo ?? '');
  const commit = () => onChange({ image: image.trim() || undefined, backgroundVideo: video.trim() || undefined });
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => event.key === 'Enter' && commit();
  return (
    <Popover.Root
      onOpenChange={({ open }) => {
        if (open) {
          setImage(value.image ?? '');
          setVideo(value.backgroundVideo ?? '');
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button.Root
          data-testid='presenter.slide-toolbar.background'
          icon='ph--image--regular'
          iconOnly
          variant='ghost'
          label={t('slide-background.label')}
        />
      </Popover.Trigger>
      <Popover.Content>
        <div className='flex flex-col gap-2 p-2 w-80'>
          <label className='flex flex-col gap-1 text-sm'>
            {t('background-image.label')}
            <Input.Root
              data-testid='presenter.background-image'
              placeholder='https://…'
              value={image}
              onChange={(event) => setImage(event.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            {t('background-video.label')}
            <Input.Root
              data-testid='presenter.background-video'
              placeholder='https://…'
              value={video}
              onChange={(event) => setVideo(event.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
            />
          </label>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
