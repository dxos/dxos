//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type LayoutName } from '@dxos/react-ui-slides';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { PresenterNamespace } from '../../namespace.ts';
import { LayoutPicker } from '../SlideToolbar/LayoutPicker.tsx';

/** Content of a slide created from a toolbar, with its `layout:` unless that is the default. */
export const newSlideContent = (layout: LayoutName = 'default'): string =>
  layout === 'default' ? '# New slide' : `---\nlayout: ${layout}\n---\n\n# New slide`;

export type AddSlideButtonProps = {
  /** The layout a new slide takes; the caret picks it. */
  layout?: LayoutName;
  onLayoutChange: (layout: LayoutName) => void;
  onAdd: () => void;
};

/**
 * Adds a slide: the plus adds one in the layout the caret last picked, and the caret opens the picker. One joined
 * run (`Button.Group compact` drops the inset between adjacent buttons), with the caret at half a control's width so
 * it reads as the plus's handle rather than as a second button.
 */
export const AddSlideButton = ({ layout, onLayoutChange, onAdd }: AddSlideButtonProps) => {
  const { t } = Hooks.useTranslation(PresenterNamespace.key);
  return (
    <Button.Group compact>
      <Button.Root
        data-testid='presenter.add-slide'
        icon='ph--plus--regular'
        iconOnly
        variant='ghost'
        label={t('add-slide.label')}
        onClick={onAdd}
      />
      <LayoutPicker
        value={layout}
        onChange={onLayoutChange}
        trigger={
          <Button.Root
            data-testid='presenter.add-slide.layout'
            icon='ph--caret-down--regular'
            iconOnly
            variant='ghost'
            label={t('add-slide-layout.label')}
            // Derived from the control metric rather than a fixed width, so it halves with the control it joins.
            classNames='w-[calc(var(--dx-control-size)/2)] min-w-0 px-0'
          />
        }
      />
    </Button.Group>
  );
};

AddSlideButton.displayName = 'AddSlideButton';
