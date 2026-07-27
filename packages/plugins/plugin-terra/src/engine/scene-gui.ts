//
// Copyright 2026 DXOS.org
//

import { type Engine } from '@babylonjs/core/Engines/engine';
import { type Observer } from '@babylonjs/core/Misc/observable';
import { type Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Checkbox } from '@babylonjs/gui/2D/controls/checkbox';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { Slider } from '@babylonjs/gui/2D/controls/sliders/slider';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';

import { type TerraConfigValues } from './generate-planet';

export type SceneGuiPatch = Partial<
  Pick<TerraConfigValues, 'waterLevel' | 'elevationScale' | 'mountainScale' | 'treeDensity' | 'resolution' | 'seed'>
>;

type SliderKey = 'waterLevel' | 'elevationScale' | 'mountainScale' | 'treeDensity' | 'resolution';

type SliderSpec = { title: string; minimum: number; maximum: number; step: number; decimals: number };

type SliderEntry = { slider: Slider; label: TextBlock; format: (value: number) => string };

// Panel geometry shared by the background rectangle and its stack panel.
const PANEL_WIDTH_PX = 240;
const PANEL_PADDING_PX = 10;

const SLIDER_KEYS: readonly SliderKey[] = [
  'waterLevel',
  'elevationScale',
  'mountainScale',
  'treeDensity',
  'resolution',
];

const SLIDER_SPECS: Record<SliderKey, SliderSpec> = {
  waterLevel: { title: 'water', minimum: 0.2, maximum: 0.7, step: 0.01, decimals: 2 },
  elevationScale: { title: 'elevation', minimum: 0.05, maximum: 0.3, step: 0.01, decimals: 2 },
  mountainScale: { title: 'mountains', minimum: 0, maximum: 1.5, step: 0.05, decimals: 2 },
  treeDensity: { title: 'trees', minimum: 0, maximum: 1, step: 0.05, decimals: 2 },
  resolution: { title: 'resolution', minimum: 64, maximum: 512, step: 64, decimals: 0 },
};

/** Builds the patch for a single slider key without a computed-key cast. */
const patchFor = (key: SliderKey, value: number): SceneGuiPatch => {
  switch (key) {
    case 'waterLevel':
      return { waterLevel: value };
    case 'elevationScale':
      return { elevationScale: value };
    case 'mountainScale':
      return { mountainScale: value };
    case 'treeDensity':
      return { treeDensity: value };
    case 'resolution':
      return { resolution: value };
  }
};

/** Increments the trailing numeric suffix of a seed string, appending one if none is present. */
const nextSeed = (seed: string): string => {
  const match = seed.match(/^(.*?)(\d+)$/);
  if (!match) {
    return `${seed}-1`;
  }
  const [, prefix, digits] = match;
  return `${prefix}${Number(digits) + 1}`;
};

export type SceneGuiOptions = {
  scene: Scene;
  engine: Engine;
  values: TerraConfigValues;
  onChange: (patch: SceneGuiPatch) => void;
  onWaterSheen: (enabled: boolean) => void;
};

/**
 * In-scene Babylon GUI overlay: config sliders/checkbox/reseed button docked top-right,
 * an FPS readout docked top-left. Keeps the article free of a separate react-ui-form panel.
 */
export class SceneGui {
  readonly #scene: Scene;
  readonly #engine: Engine;
  readonly #onChange: (patch: SceneGuiPatch) => void;
  readonly #adt: AdvancedDynamicTexture;
  readonly #fpsText: TextBlock;
  readonly #sliders: Record<SliderKey, SliderEntry>;
  readonly #fpsObserver: Observer<Scene> | null;

  #currentSeed: string;
  // Guards setValues() so programmatic control updates never re-fire onChange.
  #updating = false;

  constructor(options: SceneGuiOptions) {
    this.#scene = options.scene;
    this.#engine = options.engine;
    this.#onChange = options.onChange;
    this.#currentSeed = options.values.seed;

    this.#adt = AdvancedDynamicTexture.CreateFullscreenUI('terra-gui', true, this.#scene);

    this.#fpsText = this.#createFpsText();
    this.#adt.addControl(this.#fpsText);
    this.#fpsObserver = this.#scene.onAfterRenderObservable.add(() => {
      this.#fpsText.text = `FPS ${this.#engine.getFps().toFixed(0)}`;
    });

    const { background, stack } = this.#createPanel();
    this.#adt.addControl(background);

    this.#sliders = {
      waterLevel: this.#createSlider(stack, 'waterLevel', options.values.waterLevel),
      elevationScale: this.#createSlider(stack, 'elevationScale', options.values.elevationScale),
      mountainScale: this.#createSlider(stack, 'mountainScale', options.values.mountainScale),
      treeDensity: this.#createSlider(stack, 'treeDensity', options.values.treeDensity),
      resolution: this.#createSlider(stack, 'resolution', options.values.resolution),
    };

    stack.addControl(this.#createWaterSheenRow(options.onWaterSheen));
    stack.addControl(this.#createReseedButton());
  }

  /** Refreshes control positions/labels to match `values` without firing `onChange`. */
  setValues(values: TerraConfigValues): void {
    this.#updating = true;
    for (const key of SLIDER_KEYS) {
      const entry = this.#sliders[key];
      entry.slider.value = values[key];
      entry.label.text = entry.format(values[key]);
    }
    this.#currentSeed = values.seed;
    this.#updating = false;
  }

  dispose(): void {
    if (this.#fpsObserver) {
      this.#scene.onAfterRenderObservable.remove(this.#fpsObserver);
    }
    this.#adt.dispose();
  }

  #createFpsText(): TextBlock {
    const text = new TextBlock('fps', 'FPS 0');
    text.color = 'white';
    text.fontSize = 14;
    text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    text.width = '120px';
    text.height = '24px';
    text.paddingLeft = '12px';
    text.paddingTop = '12px';
    return text;
  }

  #createPanel(): { background: Rectangle; stack: StackPanel } {
    const background = new Rectangle('gui-panel');
    background.thickness = 0;
    background.cornerRadius = 8;
    background.background = 'rgba(12, 14, 20, 0.55)';
    background.width = `${PANEL_WIDTH_PX}px`;
    background.adaptHeightToChildren = true;
    background.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    background.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    background.paddingRight = '12px';
    background.paddingTop = '12px';

    const stack = new StackPanel('gui-stack');
    stack.isVertical = true;
    stack.spacing = 4;
    // Centered at (panel width - 2*padding) inside the fixed-width background gives even left/right insets.
    stack.width = `${PANEL_WIDTH_PX - PANEL_PADDING_PX * 2}px`;
    stack.adaptHeightToChildren = true;
    stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    stack.paddingTop = `${PANEL_PADDING_PX}px`;
    stack.paddingBottom = `${PANEL_PADDING_PX}px`;
    background.addControl(stack);

    return { background, stack };
  }

  #createSlider(stack: StackPanel, key: SliderKey, initialValue: number): SliderEntry {
    const spec = SLIDER_SPECS[key];
    const format = (value: number): string => `${spec.title} ${value.toFixed(spec.decimals)}`;

    const label = new TextBlock(`${key}-label`, format(initialValue));
    label.color = 'white';
    label.fontSize = 12;
    label.height = '18px';
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const slider = new Slider(`${key}-slider`);
    slider.minimum = spec.minimum;
    slider.maximum = spec.maximum;
    slider.step = spec.step;
    slider.value = initialValue;
    slider.height = '20px';
    slider.width = '100%';
    slider.color = '#8ac4ff';
    slider.background = 'rgba(255, 255, 255, 0.15)';
    slider.onValueChangedObservable.add((value) => {
      label.text = format(value);
      if (this.#updating) {
        return;
      }
      this.#onChange(patchFor(key, value));
    });

    stack.addControl(label);
    stack.addControl(slider);
    return { slider, label, format };
  }

  #createWaterSheenRow(onWaterSheen: (enabled: boolean) => void): StackPanel {
    const row = new StackPanel('sheen-row');
    row.isVertical = false;
    row.height = '24px';

    const checkbox = new Checkbox('sheen');
    checkbox.width = '18px';
    checkbox.height = '18px';
    checkbox.color = 'white';
    checkbox.isChecked = false;
    checkbox.onIsCheckedChangedObservable.add((enabled) => {
      if (this.#updating) {
        return;
      }
      onWaterSheen(enabled);
    });
    row.addControl(checkbox);

    const label = new TextBlock('sheen-label', 'water sheen');
    label.color = 'white';
    label.fontSize = 12;
    label.width = '140px';
    label.height = '18px';
    label.paddingLeft = '6px';
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    row.addControl(label);

    return row;
  }

  #createReseedButton(): Button {
    const button = Button.CreateSimpleButton('reseed', 'reseed');
    button.height = '28px';
    button.color = 'white';
    button.background = 'rgba(255, 255, 255, 0.12)';
    button.cornerRadius = 4;
    button.thickness = 0;
    button.onPointerUpObservable.add(() => {
      const seed = nextSeed(this.#currentSeed);
      this.#currentSeed = seed;
      this.#onChange({ seed });
    });
    return button;
  }
}
