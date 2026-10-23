//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useState } from 'react';

import { ObjectPicker } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Menu from '@dxos/react-ui/Menu';
import * as Popover from '@dxos/react-ui/Popover';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type LayoutName, type SlideFrontmatter } from '#markdown';
import { meta } from '#meta';
import { type SlideEditorViewState } from '#types';

import { LayoutPicker } from './LayoutPicker.tsx';

/** Snippets the toolbar inserts at the cursor. */
export type SlideInsert = 'click' | 'clicks' | 'column' | 'notes';

/** Frontmatter keys the background popover edits. */
export type BackgroundSettings = Pick<SlideFrontmatter, 'image' | 'backgroundVideo'>;

export type SlideToolbarProps = {
  layout: LayoutName;
  onLayoutChange: (layout: LayoutName) => void;
  onInsert: (insert: SlideInsert) => void;
  /** Whether the layout has a second column, so a column break means something. */
  columns?: boolean;
  background: BackgroundSettings;
  onBackgroundChange: (background: BackgroundSettings) => void;
  /** Objects offered by "Insert object"; requested only while its picker is open. */
  objects?: { id: string; label: string }[];
  onObjectsOpenChange?: (open: boolean) => void;
  onInsertObject?: (id: string) => void;
  previewMode: SlideEditorViewState.PreviewMode;
  onPreviewModeChange: (mode: SlideEditorViewState.PreviewMode) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onPresent?: () => void;
};

/**
 * Slide tools and view controls for the slide editor; the markdown formatting toolbar sits beside it.
 */
export const SlideToolbar = ({
  layout,
  onLayoutChange,
  onInsert,
  columns,
  background,
  onBackgroundChange,
  objects = [],
  onObjectsOpenChange,
  onInsertObject,
  previewMode,
  onPreviewModeChange,
  onPrevious,
  onNext,
  onPresent,
}: SlideToolbarProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Toolbar.Root data-testid='presenter.slide-toolbar'>
      <LayoutPicker value={layout} onChange={onLayoutChange} />
      <Menu.Root onSelect={({ value }) => onInsert(value === 'clicks' ? 'clicks' : 'click')}>
        <Menu.Trigger asChild>
          <Button.Root
            data-testid='presenter.slide-toolbar.click'
            icon='ph--cursor-click--regular'
            iconOnly
            variant='ghost'
            label={t('insert-click.label')}
          />
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item item={{ value: 'click', label: t('insert-click.label') }} data-testid='presenter.insert-click' />
          <Menu.Item
            item={{ value: 'clicks', label: t('insert-clicks.label') }}
            data-testid='presenter.insert-clicks'
          />
        </Menu.Content>
      </Menu.Root>
      <Button.Root
        data-testid='presenter.slide-toolbar.column'
        icon='ph--columns--regular'
        iconOnly
        variant='ghost'
        label={t('insert-column.label')}
        disabled={!columns}
        onClick={() => onInsert('column')}
      />
      <ObjectPicker
        options={objects}
        onOpenChange={onObjectsOpenChange}
        onSelect={(id) => id && onInsertObject?.(id)}
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
      <BackgroundPopover value={background} onChange={onBackgroundChange} />
      <Button.Root
        data-testid='presenter.slide-toolbar.notes'
        icon='ph--note--regular'
        iconOnly
        variant='ghost'
        label={t('slide-notes.label')}
        onClick={() => onInsert('notes')}
      />
      <Toolbar.Separator />
      <Toolbar.ToggleGroup
        type='single'
        value={previewMode}
        aria-label={t('preview-mode.label')}
        onValueChange={(value) => (value === 'split' || value === 'companion') && onPreviewModeChange(value)}
      >
        <ToggleGroup.Item
          value='split'
          data-testid='presenter.slide-toolbar.split'
          icon='ph--rows--regular'
          iconOnly
          label={t('preview-split.label')}
        />
        <ToggleGroup.Item
          value='companion'
          data-testid='presenter.slide-toolbar.companion'
          icon='ph--sidebar-simple--regular'
          iconOnly
          label={t('preview-companion.label')}
        />
      </Toolbar.ToggleGroup>
      <Button.Root
        data-testid='presenter.slide-toolbar.previous'
        icon='ph--caret-left--regular'
        iconOnly
        variant='ghost'
        label={t('previous-slide.label')}
        disabled={!onPrevious}
        onClick={onPrevious}
      />
      <Button.Root
        data-testid='presenter.slide-toolbar.next'
        icon='ph--caret-right--regular'
        iconOnly
        variant='ghost'
        label={t('next-slide.label')}
        disabled={!onNext}
        onClick={onNext}
      />
      <Button.Root
        data-testid='presenter.slide-toolbar.present'
        icon='ph--presentation--regular'
        iconOnly
        variant='ghost'
        label={t('present-from-here.label')}
        disabled={!onPresent}
        onClick={onPresent}
      />
    </Toolbar.Root>
  );
};

type BackgroundPopoverProps = { value: BackgroundSettings; onChange: (value: BackgroundSettings) => void };

/** Image and video URL fields for the slide background; each commits on Enter or blur, and empty removes it. */
const BackgroundPopover = ({ value, onChange }: BackgroundPopoverProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
