//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { shortcutFor } from '../../model/keys.ts';
import {
  type BackgroundGrid,
  type LookTone,
  type Theme,
  type ThemeRegistry,
  resolveBackground,
  resolveStyleSet,
  styleVariant,
} from '../../model/style-set.ts';
import { FLOATING_PANEL } from '../../utils/chrome.ts';
import { variantClasses } from '../../utils/style.ts';
import { BACKGROUND_FILLS, RADIUS_CLASSES } from '../../utils/surfaces.ts';

/** The canvas colour behind a swatch in its theme's mode. */
const SWATCH_CANVAS: Record<LookTone, string> = {
  theme: 'bg-base-surface',
  light: 'bg-white',
  dark: 'bg-neutral-900',
};

/** A wash in a swatch, as the background draws it across the field: a soft spot of its hue. */
const washGradient = (theme: Theme, registry: ThemeRegistry): CSSProperties | undefined => {
  const background = resolveBackground(registry, theme.background);
  if (background.washes.length === 0) {
    return undefined;
  }
  return {
    backgroundImage: background.washes
      .map(
        (wash) =>
          `radial-gradient(circle at ${wash.x * 100}% ${wash.y * 100}%, color-mix(in oklch, var(--color-${wash.hue}-500) ${Math.round(wash.strength * 200)}%, transparent), transparent 70%)`,
      )
      .join(', '),
  };
};

export type ThemeSwatchProps = Util.ThemedClassName<{ theme: Theme; registry: ThemeRegistry }>;

/** A theme in miniature: its background, and two shapes in its style set's default variant. */
export const ThemeSwatch = ({ classNames, theme, registry }: ThemeSwatchProps) => {
  const tone: LookTone = theme.mode ?? 'theme';
  const background = resolveBackground(registry, theme.background);
  const styleSet = resolveStyleSet(registry, theme.styleSet);
  const variant = styleVariant(styleSet, undefined);
  const shape = (hue: string) => {
    const classes = variantClasses(hue, variant, tone);
    return mx('w-2 h-1.5 border', classes.surface, classes.border, RADIUS_CLASSES.sm);
  };
  return (
    <span
      aria-hidden
      className={mx(
        // Shorter than the trigger, so it sits inside the trigger's inset focus ring rather than over it.
        'inline-flex shrink-0 items-center justify-center gap-0.5 w-7 h-3.5 rounded-xs border border-separator overflow-hidden',
        BACKGROUND_FILLS[background.surface] || SWATCH_CANVAS[tone],
        classNames,
      )}
      style={washGradient(theme, registry)}
      data-testid={`theme-swatch-${theme.id}`}
    >
      <span className={shape('blue')} />
      <span className={shape('amber')} />
    </span>
  );
};

/** The value of the option that clears the override, so the drawing takes the user's default. */
const DEFAULT_VALUE = '';

const GRID_OPTIONS: readonly { grid: BackgroundGrid; icon: string; label: string }[] = [
  { grid: 'dots', icon: 'ph--dots-nine--regular', label: 'Dots on the minor grid' },
  { grid: 'lines', icon: 'ph--grid-four--regular', label: 'Lines on the minor and major grid' },
  { grid: 'none', icon: 'ph--prohibit--regular', label: 'No grid' },
];

const barClasses = mx('w-full gap-1 px-2 py-1', FLOATING_PANEL);

export type ThemeBarProps = Util.ThemedClassName<{
  registry: ThemeRegistry;
  /** The theme drawn, override or default. */
  theme: Theme;
  /** The theme chosen here, over the default; unset, the default is in use. */
  override?: string;
  /** The grid drawn, the background's own or the override. */
  grid: BackgroundGrid;
  /** Picks a theme; `undefined` clears the override. Absent, the theme is shown but cannot be changed. */
  onThemeChange?: (id: string | undefined) => void;
  /** Picks a grid over the background's own; `undefined` clears the override. */
  onGridChange?: (grid: BackgroundGrid | undefined) => void;
  /** The grid the theme's background draws, so picking it again clears the override. */
  themeGrid: BackgroundGrid;
  /** Whether the lattice cells are drawn; with `onGuidesToggle`, a toggle follows the grid options. */
  guides?: boolean;
  onGuidesToggle?: () => void;
}>;

/** The theme picker, and the grid drawn over its background. */
export const ThemeBar = ({
  classNames,
  registry,
  theme,
  override,
  grid,
  themeGrid,
  onThemeChange,
  onGridChange,
  guides,
  onGuidesToggle,
}: ThemeBarProps) => (
  // Visible overflow, so the focused trigger's ring is not clipped by the bar's horizontal scroll.
  <Toolbar.Root classNames={mx(barClasses, 'overflow-visible', classNames)} data-testid='canvas-theme'>
    <Menu.Root positioning={{ placement: 'top-end', gutter: 4 }}>
      <Menu.Trigger asChild disabled={!onThemeChange}>
        <Button.Root variant='ghost' classNames='gap-2 px-2' data-testid='theme-trigger'>
          <ThemeSwatch theme={theme} registry={registry} />
          <span className='truncate'>{theme.name}</span>
          <Icon.Icon icon='ph--caret-up-down--regular' size='xs' />
        </Button.Root>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.RadioItemGroup
          value={override ?? DEFAULT_VALUE}
          onValueChange={({ value }) => onThemeChange?.(value === DEFAULT_VALUE ? undefined : value)}
        >
          <Menu.RadioItem item={{ value: DEFAULT_VALUE, label: 'Default' }} data-testid='theme-option-default'>
            <span className='w-7 shrink-0' />
            <Menu.ItemText />
            <Menu.ItemIndicator />
          </Menu.RadioItem>
          {Object.values(registry.themes).map((option) => (
            <Menu.RadioItem
              key={option.id}
              item={{ value: option.id, label: option.name }}
              data-testid={`theme-option-${option.id}`}
            >
              <ThemeSwatch theme={option} registry={registry} />
              <Menu.ItemText />
              {option.mode && (
                <Icon.Icon
                  icon={option.mode === 'dark' ? 'ph--moon--regular' : 'ph--sun--regular'}
                  size='sm'
                  classNames='text-fg-muted'
                />
              )}
              <Menu.ItemIndicator />
            </Menu.RadioItem>
          ))}
        </Menu.RadioItemGroup>
      </Menu.Content>
    </Menu.Root>
    <Toolbar.Separator variant='line' />
    {/* A guide is drawn on the grid, so the toggle leads the grid options. */}
    {onGuidesToggle && (
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--frame-corners--regular'
        label={`Guides (${shortcutFor('guides')}): show the lattice cells`}
        classNames={mx(guides && 'bg-primary-500/20')}
        data-testid='toolbar-guides'
        onClick={onGuidesToggle}
      />
    )}
    {GRID_OPTIONS.map((option) => (
      <Button.Root
        key={option.grid}
        variant='ghost'
        iconOnly
        icon={option.icon}
        label={option.label}
        disabled={!onGridChange}
        classNames={mx(grid === option.grid && 'bg-primary-500/20')}
        data-testid={`theme-grid-${option.grid}`}
        onClick={() => onGridChange?.(option.grid === themeGrid ? undefined : option.grid)}
      />
    ))}
  </Toolbar.Root>
);
