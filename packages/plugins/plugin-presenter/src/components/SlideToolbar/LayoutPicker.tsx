//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';

import { type LayoutName, LAYOUTS } from '#markdown';
import { meta } from '#meta';

import { MarkdownSlide } from '../MarkdownSlide/index.ts';
import { SlideFrame } from '../SlideFrame/index.ts';

// Placeholder content per thumbnail, so each layout shows how it places a title, text and columns.
const sample = (layout: LayoutName): string => {
  const head = `---\nlayout: ${layout}\n---\n`;
  switch (layout) {
    case 'two-cols':
      return `${head}# Left\n\n- Point\n- Point\n\n::right::\n\n# Right\n\n- Point`;
    case 'two-cols-header':
      return `${head}# Header\n\n::left::\n\n- Left\n\n::right::\n\n- Right`;
    case 'quote':
      return `${head}> A quotation.`;
    case 'fact':
      return `${head}# 100%\n\nA fact`;
    case 'image':
    case 'image-left':
    case 'image-right':
      return `${head}# Title\n\nText beside the image.`;
    case 'none':
      return `${head}Raw content`;
    default:
      return `${head}# Title\n\nSupporting text`;
  }
};

export type LayoutPickerProps = {
  value: LayoutName;
  onChange: (layout: LayoutName) => void;
};

/**
 * Toolbar button opening a grid of layout thumbnails; picking one sets the slide's `layout:`.
 */
export const LayoutPicker = ({ value, onChange }: LayoutPickerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => LAYOUTS.map((layout) => ({ value: layout, label: t(`layout.${layout}.label`, { defaultValue: layout }) })),
    [t],
  );
  return (
    <Popover.Root open={open} onOpenChange={({ open }) => setOpen(open)}>
      <Popover.Trigger asChild>
        <Button.Root
          data-testid='presenter.slide-toolbar.layout'
          icon='ph--layout--regular'
          variant='ghost'
          label={t('slide-layout.label')}
        >
          {t(`layout.${value}.label`, { defaultValue: value })}
        </Button.Root>
      </Popover.Trigger>
      {/* The grid is wider than a popover's default cap, so the cap is lifted to the viewport. */}
      <Popover.Content classNames='max-w-[calc(100vw-1rem)] overflow-auto'>
        {/* Thumbnails mount only while open, since each one renders a full slide. */}
        {open && (
          <Listbox.Root
            items={options}
            tiles={4}
            value={value}
            onValueChange={(next) => {
              const layout = LAYOUTS.find((name) => name === next);
              if (layout) {
                onChange(layout);
                setOpen(false);
              }
            }}
          >
            <Listbox.Content aria-label={t('slide-layout.label')} classNames='w-[40rem]'>
              {options.map(({ value: layout }) => (
                <Listbox.Item
                  key={layout}
                  id={layout}
                  data-testid={`presenter.slide-toolbar.layout.${layout}`}
                  classNames='text-xs aria-selected:outline-2 aria-selected:outline-focus'
                >
                  <div className='relative flex aspect-video pointer-events-none border border-separator'>
                    <SlideFrame>
                      <MarkdownSlide content={sample(layout)} />
                    </SlideFrame>
                  </div>
                  <Listbox.ItemText />
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        )}
      </Popover.Content>
    </Popover.Root>
  );
};
