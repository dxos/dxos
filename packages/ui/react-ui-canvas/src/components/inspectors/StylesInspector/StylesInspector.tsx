//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Menu from '@dxos/react-ui/Menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { hueClasses } from '../../../utils/index.ts';
import { InspectorMenu } from '../InspectorMenu/index.ts';
import { type InspectorProps } from '../types.ts';

/** One named style the inspector lists: the drawing's own (`model`) or a shared catalog's (read-only). */
export type StyleEntry = {
  /** What an element's `style` holds to take it: the model's key, or `catalog:key`. */
  id: string;
  name: string;
  /** Where it comes from: the drawing's model, or a catalog's name. */
  source: 'model' | string;
  /** The style's hue, for its swatch. */
  hue?: string;
};

export type StylesInspectorProps = InspectorProps & {
  styles: readonly StyleEntry[];
  /** The selection's style, when every selected element takes the same one. */
  current?: string;
  /** Something is selected, so a style can be taken from it or applied to it. */
  hasSelection: boolean;
  onApply?: (id: string | undefined) => void;
  onCreateFromSelection?: () => void;
  onDelete?: (id: string) => void;
};

/** A style's swatch: its hue's strong fill and border, as the style grid draws it. */
const swatch = (hue: string | undefined): string => {
  const { surface, border } = hueClasses(hue, 1);
  return mx(surface, border);
};

/**
 * The named styles an element can take (decision 15): the drawing's own first, then each catalog's (themes are the
 * default catalogs). A click applies one to the selection; a new style takes the selected element's own look.
 */
export const StylesInspector = ({
  classNames,
  styles,
  current,
  hasSelection,
  readonly,
  onApply,
  onCreateFromSelection,
  onDelete,
}: StylesInspectorProps) => {
  const own = current === undefined ? undefined : styles.find((style) => style.id === current);
  return (
    <>
      <Toolbar.Root data-testid='styles-toolbar'>
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--plus--regular'
          label='New style from selection'
          disabled={readonly || !hasSelection || !onCreateFromSelection}
          data-testid='styles-create'
          onClick={() => onCreateFromSelection?.()}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--eraser--regular'
          label='Clear the style'
          disabled={readonly || !hasSelection || current === undefined || !onApply}
          data-testid='styles-clear'
          onClick={() => onApply?.(undefined)}
        />
        <Toolbar.Separator variant='gap' />
        <InspectorMenu data-testid='styles-menu'>
          <Menu.Item
            item={{ value: 'delete', label: 'Delete style', icon: 'ph--trash--regular' }}
            disabled={readonly || !onDelete || own?.source !== 'model'}
            data-testid='styles-delete'
            onSelect={() => own && onDelete?.(own.id)}
          />
        </InspectorMenu>
      </Toolbar.Root>
      <OrderedList.Root
        items={styles}
        getLabel={(style) => style.name}
        readonly
        value={current}
        onValueChange={(id) => !readonly && hasSelection && onApply?.(id)}
      >
        {({ items }) => (
          <OrderedList.Content classNames={classNames} data-testid='styles' gutter='none' aria-label='Styles'>
            {items.map((style) => (
              <OrderedList.Item
                key={style.id}
                id={style.id}
                classNames='cursor-pointer'
                data-testid={`style-${style.id}`}
              >
                <span
                  aria-hidden
                  className={mx('shrink-0 size-4 ms-2 rounded-xs border', swatch(style.hue))}
                  data-testid={`style-swatch-${style.id}`}
                />
                <span className='dx-listbox-item-text grow truncate'>{style.name}</span>
                {style.source !== 'model' && (
                  <span className='shrink-0 px-2 text-sm text-fg-muted'>{style.source}</span>
                )}
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
    </>
  );
};
