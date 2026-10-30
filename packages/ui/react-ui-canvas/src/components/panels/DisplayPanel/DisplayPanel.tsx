//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { type Scene } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import {
  type BackgroundGrid,
  type LookTone,
  type Theme,
  type ThemeRegistry,
  resolveBackground,
  resolveStyleSet,
  shortcutFor,
  softVars,
  styleVariant,
} from '../../../model/index.ts';
import { BACKGROUND_FILLS, FLOATING_BAR, RADIUS_CLASSES, variantClasses } from '../../../utils/index.ts';
import { type PanelProps } from '../types.ts';

/** The canvas colour behind a swatch in its theme's mode. */
const SWATCH_CANVAS: Record<LookTone, string> = {
  theme: 'bg-base-surface',
  light: 'bg-white',
  dark: 'bg-neutral-900',
};

/** A wash in a swatch, as the background draws it across the field: a soft spot of its hue. */
/** The soft tokens at a swatch's size, since the picker's menu is portalled out of the canvas that sets them. */
const SWATCH_SOFT = softVars(0.2);

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
      style={{ ...SWATCH_SOFT, ...washGradient(theme, registry) }}
      data-testid={`theme-swatch-${theme.id}`}
    >
      <span className={shape('blue')} />
      <span className={shape('amber')} />
    </span>
  );
};

/** A registry theme, which a swatch can draw, rather than a plain option. */
const isTheme = (theme: Theme | ThemeOption): theme is Theme => 'background' in theme;

/** The value of the option that clears the override, so the drawing takes the user's default. */
const DEFAULT_VALUE = '';

/** The grids the switch offers; pressing the one drawn turns the grid off, so no option of its own is needed. */
const GRID_OPTIONS: readonly { grid: Exclude<BackgroundGrid, 'none'>; icon: string; label: string }[] = [
  { grid: 'dots', icon: 'ph--dots-nine--regular', label: 'Dots on the minor grid' },
  { grid: 'lines', icon: 'ph--grid-four--regular', label: 'Lines on the minor and major grid' },
];

const barClasses = mx('w-full', FLOATING_BAR);

/** A theme a view without a theme registry offers (e.g. a 3D scene's looks), by id and name. */
export type ThemeOption = { id: string; name: string };

export type DisplayPanelProps = PanelProps & {
  /** The 2D canvas's themes, drawn as swatches; without it the panel offers `themes` by name. */
  registry?: ThemeRegistry;
  /** The theme drawn, override or default; with a `registry`, one of its themes. */
  theme: Theme | ThemeOption;
  /** Themes by name, for a view without a registry. */
  themes?: readonly ThemeOption[];
  /** The theme chosen here, over the default; unset, the default is in use. */
  override?: string;
  /** The grid drawn, the background's own or the override. */
  grid: BackgroundGrid;
  /** The grids offered, by default dots and lines; a view with one kind of grid offers a single toggle. */
  gridOptions?: readonly Exclude<BackgroundGrid, 'none'>[];
  /** Picks a theme; `undefined` clears the override. Absent, the theme is shown but cannot be changed. */
  onThemeChange?: (id: string | undefined) => void;
  /** Picks a grid over the background's own; `undefined` clears the override. */
  onGridChange?: (grid: BackgroundGrid | undefined) => void;
  /** The grid the theme's background draws, so picking it again clears the override; none by default. */
  themeGrid?: BackgroundGrid;
  /** Whether the lattice cells are drawn; with `onGuidesToggle`, a toggle follows the grid options. */
  guides?: boolean;
  onGuidesToggle?: () => void;
  /** Whether the axes are drawn (3D's in red, green and blue, 2D's in a stronger grid colour); with `onAxesToggle`, a toggle. */
  axes?: boolean;
  onAxesToggle?: () => void;
  /** The scene's dimension, which picks the axes icon; 2D by default. */
  dim?: Scene.Dimension;
  /** Whether moves, resizes and new nodes snap to the grid; with `onSnapToggle`, a toggle leads the grid controls. */
  snap?: boolean;
  onSnapToggle?: () => void;
  /** A lattice scene: snap lands on the lattice's cells, and the lattice is the grid, so no grid choice is offered. */
  lattice?: boolean;
};

/**
 * The canvas's look: the snap, guides and axes toggles, a switch between dots and lines over the background (pressing the one
 * drawn turns the grid off), and the theme selector last.
 */
export const DisplayPanel = ({
  classNames,
  readonly,
  registry,
  theme,
  themes,
  override,
  grid,
  gridOptions,
  themeGrid = 'none',
  onThemeChange,
  onGridChange,
  guides,
  onGuidesToggle,
  axes,
  onAxesToggle,
  dim = '2d',
  snap,
  onSnapToggle,
  lattice,
}: DisplayPanelProps) => (
  // Visible overflow, so the focused trigger's ring is not clipped by the bar's horizontal scroll.
  <Toolbar.Root classNames={mx(barClasses, 'overflow-visible', classNames)} data-testid='canvas-display'>
    {/* Snapping is to the grid, so its toggles sit with the grid's. */}
    {onSnapToggle && (
      <Button.Toggle
        variant='ghost'
        iconOnly
        icon='ph--magnet--regular'
        label={`Snap (${shortcutFor('snap')}): snap moves, resizes and new nodes to the ${lattice ? "lattice's cells" : 'major grid'}`}
        disabled={readonly}
        pressed={snap === true}
        data-testid='toolbar-snap'
        onPressedChange={onSnapToggle}
      />
    )}
    {/* Snapping is behaviour, the rest is what the canvas draws. */}
    {onSnapToggle && <Toolbar.Separator variant='line' />}
    {/* A guide is drawn on the grid, so the toggle leads the grid options. */}
    {onGuidesToggle && (
      <Button.Toggle
        variant='ghost'
        iconOnly
        icon='ph--squares-four--regular'
        label={`Guides (${shortcutFor('guides')}): show the lattice cells`}
        disabled={readonly}
        pressed={guides === true}
        data-testid='toolbar-guides'
        onPressedChange={onGuidesToggle}
      />
    )}
    {onAxesToggle && (
      <Button.Toggle
        variant='ghost'
        iconOnly
        icon={dim === '3d' ? 'ph--vector-three--regular' : 'ph--vector-two--regular'}
        label='Axes: show the axes through the origin'
        // A viewing aid, not an edit, so a read-only scene offers it too.
        pressed={axes === true}
        data-testid='toolbar-axes'
        onPressedChange={onAxesToggle}
      />
    )}
    {/* One group of toggles, at most one pressed: pressing the one drawn turns the grid off; hidden on a lattice scene. */}
    {lattice !== true && (
      <Button.Group compact role='group' aria-label='Grid'>
        {GRID_OPTIONS.filter((option) => !gridOptions || gridOptions.includes(option.grid)).map((option) => (
          <Button.Toggle
            key={option.grid}
            variant='ghost'
            iconOnly
            icon={option.icon}
            label={option.label}
            disabled={readonly || !onGridChange}
            pressed={grid === option.grid}
            data-testid={`theme-grid-${option.grid}`}
            onPressedChange={(pressed) => {
              const next: BackgroundGrid = pressed ? option.grid : 'none';
              onGridChange?.(next === themeGrid ? undefined : next);
            }}
          />
        ))}
      </Button.Group>
    )}
    <Toolbar.Separator variant='line' />
    <Menu.Root positioning={{ placement: 'top-end', gutter: 4 }}>
      <Menu.Trigger asChild disabled={readonly || !onThemeChange}>
        <Button.Root variant='ghost' classNames='gap-2 px-2' data-testid='theme-trigger'>
          {registry && isTheme(theme) && <ThemeSwatch theme={theme} registry={registry} />}
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
          {registry &&
            Object.values(registry.themes).map((option) => (
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
          {!registry &&
            themes?.map((option) => (
              <Menu.RadioItem
                key={option.id}
                item={{ value: option.id, label: option.name }}
                data-testid={`theme-option-${option.id}`}
              >
                <Menu.ItemText />
                <Menu.ItemIndicator />
              </Menu.RadioItem>
            ))}
        </Menu.RadioItemGroup>
      </Menu.Content>
    </Menu.Root>
  </Toolbar.Root>
);
