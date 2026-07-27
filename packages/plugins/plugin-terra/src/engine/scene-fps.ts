//
// Copyright 2026 DXOS.org
//

import { type Engine } from '@babylonjs/core/Engines/engine';
import { type Observer } from '@babylonjs/core/Misc/observable';
import { type Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';

// Controls are authored against the ADT's ideal coordinate space (see idealHeight below),
// not device pixels, so these sizes read the same on hi-DPI displays as on standard ones.
const IDEAL_HEIGHT = 1024;

export type SceneFpsWidgetOptions = {
  scene: Scene;
  engine: Engine;
};

/** In-scene Babylon GUI overlay showing an FPS readout docked top-left; config now lives in `TerraForm`. */
export class SceneFpsWidget {
  readonly #scene: Scene;
  readonly #engine: Engine;
  readonly #adt: AdvancedDynamicTexture;
  readonly #fpsText: TextBlock;
  readonly #fpsObserver: Observer<Scene> | null;

  constructor(options: SceneFpsWidgetOptions) {
    this.#scene = options.scene;
    this.#engine = options.engine;

    this.#adt = AdvancedDynamicTexture.CreateFullscreenUI('terra-fps', true, this.#scene);
    // Author against a fixed ideal space so control sizes are DPI-independent: without this the
    // ADT renders at the engine's device-ratio-scaled buffer and controls appear at half size or less.
    this.#adt.idealHeight = IDEAL_HEIGHT;

    this.#fpsText = this.#createFpsText();
    this.#adt.addControl(this.#fpsText);
    this.#fpsObserver = this.#scene.onAfterRenderObservable.add(() => {
      this.#fpsText.text = `FPS ${this.#engine.getFps().toFixed(0)}`;
    });
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
    text.fontSize = 18;
    text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    text.width = '160px';
    text.height = '32px';
    text.paddingLeft = '16px';
    text.paddingTop = '16px';
    return text;
  }
}
