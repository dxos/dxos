//
// Copyright 2025 DXOS.org
//

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

export type DxRangeSpinbuttonVariant = 'reverse-range' | 'reverse-order' | 'torsion';

@customElement('dx-range-spinbutton')
export class DxRangeSpinbutton extends LitElement {
  @property({ type: String })
  label: string = '';

  @property({ type: String })
  min: string | number = 0;

  @property({ type: String })
  max: string | number = 100;

  @property({ type: String })
  step: string | number = 1;

  @property({ type: String })
  value: string | number = 0;

  @property({ type: String })
  headingId: string = '';

  @property({ type: String })
  variant?: DxRangeSpinbuttonVariant;

  private handleInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this.value = value;

    // For torsion variant, calculate and apply styles
    if (this.variant === 'torsion') {
      const controlInputsDiv = (e.target as HTMLElement).closest('.control-inputs');
      if (controlInputsDiv) {
        const styles = this.calculateTorsionStyles(Number(value), Number(this.min), Number(this.max));
        Object.entries(styles).forEach(([key, value]) => {
          (controlInputsDiv as HTMLElement).style.setProperty(key, value);
        });
      }
    }

    // Dispatch custom event
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: parseFloat(value) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private calculateTorsionStyles(value: number, min: number, max: number): Record<string, string> {
    // Calculate the width per step
    const totalSteps = Math.abs(min) + Math.abs(max);
    const widthPerStep = 100 / totalSteps; // Using percentage for width

    // Calculate the width of the before element
    const beforeWidth = `${Math.abs(value) * widthPerStep}%`;

    // Calculate the position of the before element
    let beforeLeft = '50%';
    if (value < 0) {
      beforeLeft = `calc(50% - ${beforeWidth})`;
    }

    return {
      '--before-width': beforeWidth,
      '--before-left': beforeLeft,
    };
  }

  override render() {
    const controlId = `${this.headingId}-${this.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // For torsion variant, calculate initial styles
    const isTorsion = this.variant === 'torsion';
    const initialStyles = isTorsion
      ? this.calculateTorsionStyles(Number(this.value), Number(this.min), Number(this.max))
      : {};

    return html`
      <label class="control-label" id="${controlId}-label" for="${controlId}-range">${this.label}:</label>
      <div
        class="${classMap({ 'control-inputs': true, ...(this.variant && { [this.variant]: true }) })}"
        style=${isTorsion ? styleMap(initialStyles) : undefined}
      >
        <input
          id="${controlId}-range"
          type="range"
          min="${this.min}"
          max="${this.max}"
          step="${this.step}"
          class="range-input dx-focus-ring"
          .value=${this.value.toString()}
          @input=${this.handleInput}
          aria-labelledby="${this.headingId} ${controlId}-label"
        />
        <input
          id="${controlId}-number"
          type="number"
          min="${this.min}"
          max="${this.max}"
          step="${this.step}"
          class="number-input dx-input dx-focus-ring"
          .value=${this.value.toString()}
          @input=${this.handleInput}
          aria-labelledby="${this.headingId} ${controlId}-label"
        />
      </div>
    `;
  }

  override createRenderRoot(): this {
    return this;
  }
}
