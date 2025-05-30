//
// Copyright 2025 DXOS.org
//

// This implementation is based on WAI-APG: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/

import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

import '../dx-icon/dx-icon';

export type DxAutocompleteComboboxProps = Pick<DxAutocompleteCombobox, 'label' | 'options' | 'autocomplete'>;

/**
 * Autocomplete combobox component.
 */
@customElement('dx-autocomplete-combobox')
export class DxAutocompleteCombobox extends LitElement {
  private _inputId: string;
  private _buttonId: string;
  private _listboxId: string;
  private _comboboxHasVisualFocus: boolean = false;
  private _listboxHasVisualFocus: boolean = false;
  private _hasHover: boolean = false;
  private _filteredOptions: HTMLLIElement[] = [];
  private _option: HTMLLIElement | null = null;
  private _firstOption: HTMLLIElement | null = null;
  private _lastOption: HTMLLIElement | null = null;
  private _filter: string = '';

  @property({ type: String })
  label: string = 'Label';

  @property({ type: Array })
  options: string[] = [];

  @property({ type: String })
  autocomplete: 'none' | 'list' | 'both' = 'list';

  @state()
  private _isOpen: boolean = false;

  @state()
  private _visibleOptions: string[] = [];

  @state()
  private _inputValue: string = '';

  constructor() {
    super();
    this._inputId = makeId('combobox-input');
    this._buttonId = makeId('combobox-button');
    this._listboxId = makeId('combobox-listbox');
  }

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('pointerup', this._onBackgroundPointerUp);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerup', this._onBackgroundPointerUp);
  }

  override firstUpdated() {
    // Initialize visible options with all options
    this._visibleOptions = [...this.options];

    // Initial filtering
    this._filterOptions();
  }

  private _getLowercaseContent(node: HTMLElement): string {
    return node.textContent?.toLowerCase() || '';
  }

  private _isOptionInView(option: HTMLElement): boolean {
    const bounding = option.getBoundingClientRect();
    return (
      bounding.top >= 0 &&
      bounding.left >= 0 &&
      bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  private _setActiveDescendant(option: HTMLLIElement | null) {
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
    if (option && this._listboxHasVisualFocus && inputNode) {
      inputNode.setAttribute('aria-activedescendant', option.id);
      if (!this._isOptionInView(option)) {
        option.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (inputNode) {
      inputNode.setAttribute('aria-activedescendant', '');
    }
  }

  private _setValue(value: string) {
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
    if (inputNode) {
      this._filter = value;
      this._inputValue = this._filter;
      inputNode.setSelectionRange(this._filter.length, this._filter.length);
      this._filterOptions();
    }
  }

  private _setOption(option: HTMLLIElement | null, flag: boolean = false) {
    if (option) {
      this._option = option;
      this._setCurrentOptionStyle(this._option);
      this._setActiveDescendant(this._option);

      if (this.autocomplete === 'both') {
        const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
        if (inputNode) {
          this._inputValue = option.textContent?.trim() || '';
          if (flag) {
            inputNode.setSelectionRange(option.textContent?.length || 0, option.textContent?.length || 0);
          } else {
            inputNode.setSelectionRange(this._filter.length, option.textContent?.length || 0);
          }
        }
      }
    }
  }

  private _setVisualFocusCombobox() {
    const listboxNode = this.renderRoot.querySelector(`#${this._listboxId}`) as HTMLUListElement;
    const comboboxGroup = this.renderRoot.querySelector('.group') as HTMLDivElement;

    if (listboxNode && comboboxGroup) {
      listboxNode.classList.remove('focus');
      comboboxGroup.classList.add('focus');
      this._comboboxHasVisualFocus = true;
      this._listboxHasVisualFocus = false;
      this._setActiveDescendant(null);
    }
  }

  private _setVisualFocusListbox() {
    const listboxNode = this.renderRoot.querySelector(`#${this._listboxId}`) as HTMLUListElement;
    const comboboxGroup = this.renderRoot.querySelector('.group') as HTMLDivElement;

    if (listboxNode && comboboxGroup) {
      comboboxGroup.classList.remove('focus');
      this._comboboxHasVisualFocus = false;
      this._listboxHasVisualFocus = true;
      listboxNode.classList.add('focus');
      this._setActiveDescendant(this._option);
    }
  }

  private _removeVisualFocusAll() {
    const listboxNode = this.renderRoot.querySelector(`#${this._listboxId}`) as HTMLUListElement;
    const comboboxGroup = this.renderRoot.querySelector('.group') as HTMLDivElement;

    if (listboxNode && comboboxGroup) {
      comboboxGroup.classList.remove('focus');
      this._comboboxHasVisualFocus = false;
      this._listboxHasVisualFocus = false;
      listboxNode.classList.remove('focus');
      this._option = null;
      this._setActiveDescendant(null);
    }
  }

  private _filterOptions(): HTMLLIElement | null {
    // Do not filter any options if autocomplete is none
    if (this.autocomplete === 'none') {
      this._filter = '';
    }

    const currentOption = this._option;
    const filter = this._filter.toLowerCase();

    // Update the visible options based on the filter
    this._visibleOptions = this.options.filter(
      (optionText) => filter.length === 0 || optionText.toLowerCase().indexOf(filter) === 0,
    );

    // Update filtered options after render
    void this.updateComplete.then(() => {
      const listboxNode = this.renderRoot.querySelector(`#${this._listboxId}`) as HTMLUListElement;
      if (listboxNode) {
        const optionNodes = listboxNode.querySelectorAll('li[role="option"]');
        this._filteredOptions = Array.from(optionNodes) as HTMLLIElement[];

        // Use populated options array to initialize firstOption and lastOption.
        const numItems = this._filteredOptions.length;
        if (numItems > 0) {
          this._firstOption = this._filteredOptions[0];
          this._lastOption = this._filteredOptions[numItems - 1];

          // If current option is still in filtered list, keep it selected
          if (currentOption && this._filteredOptions.some((opt) => opt.textContent === currentOption.textContent)) {
            const index = this._filteredOptions.findIndex((opt) => opt.textContent === currentOption.textContent);
            if (index >= 0) {
              this._option = this._filteredOptions[index];
              this._setCurrentOptionStyle(this._option);
            } else {
              this._option = this._firstOption;
            }
          } else {
            this._option = this._firstOption;
          }
        } else {
          this._firstOption = null;
          this._option = null;
          this._lastOption = null;
        }
      }
    });

    // Return the current option for immediate use
    return this._option;
  }

  private _setCurrentOptionStyle(option: HTMLLIElement | null) {
    if (!option) {
      return;
    }

    for (let i = 0; i < this._filteredOptions.length; i++) {
      const opt = this._filteredOptions[i];
      if (opt === option) {
        opt.setAttribute('aria-selected', 'true');
        const listboxNode = this.renderRoot.querySelector(`#${this._listboxId}`) as HTMLUListElement;
        if (listboxNode) {
          if (listboxNode.scrollTop + listboxNode.offsetHeight < opt.offsetTop + opt.offsetHeight) {
            listboxNode.scrollTop = opt.offsetTop + opt.offsetHeight - listboxNode.offsetHeight;
          } else if (listboxNode.scrollTop > opt.offsetTop + 2) {
            listboxNode.scrollTop = opt.offsetTop;
          }
        }
      } else {
        opt.removeAttribute('aria-selected');
      }
    }
  }

  private _getPreviousOption(currentOption: HTMLLIElement): HTMLLIElement | null {
    if (currentOption !== this._firstOption && this._firstOption) {
      const index = this._filteredOptions.indexOf(currentOption);
      return index > 0 ? this._filteredOptions[index - 1] : null;
    }
    return this._lastOption;
  }

  private _getNextOption(currentOption: HTMLLIElement): HTMLLIElement | null {
    if (currentOption !== this._lastOption && this._lastOption) {
      const index = this._filteredOptions.indexOf(currentOption);
      return index < this._filteredOptions.length - 1 ? this._filteredOptions[index + 1] : null;
    }
    return this._firstOption;
  }

  private _doesOptionHaveFocus(): boolean {
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
    return inputNode ? inputNode.getAttribute('aria-activedescendant') !== '' : false;
  }

  private _hasOptions(): boolean {
    return this._filteredOptions.length > 0;
  }

  private _open() {
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
    const buttonNode = this.renderRoot.querySelector(`#${this._buttonId}`) as HTMLButtonElement;

    if (inputNode && buttonNode) {
      this._isOpen = true;
      inputNode.setAttribute('aria-expanded', 'true');
      buttonNode.setAttribute('aria-expanded', 'true');
    }
  }

  private _close(force: boolean = false) {
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
    const buttonNode = this.renderRoot.querySelector(`#${this._buttonId}`) as HTMLButtonElement;

    if (
      (force || (!this._comboboxHasVisualFocus && !this._listboxHasVisualFocus && !this._hasHover)) &&
      inputNode &&
      buttonNode
    ) {
      this._setCurrentOptionStyle(null);
      this._isOpen = false;
      inputNode.setAttribute('aria-expanded', 'false');
      buttonNode.setAttribute('aria-expanded', 'false');
      this._setActiveDescendant(null);
      const comboboxGroup = this.renderRoot.querySelector('.group') as HTMLDivElement;
      if (comboboxGroup) {
        comboboxGroup.classList.add('focus');
      }
    }
  }

  private _isPrintableCharacter(str: string): boolean {
    return str.length === 1 && !!str.match(/\S| /);
  }

  // Event handlers
  private _onComboboxKeyDown = (event: KeyboardEvent) => {
    let flag = false;
    const altKey = event.altKey;

    if (event.ctrlKey || event.shiftKey) {
      return;
    }

    switch (event.key) {
      case 'Enter':
        if (this._listboxHasVisualFocus && this._option) {
          this._setValue(this._option.textContent?.trim() || '');
        }
        this._close(true);
        this._setVisualFocusCombobox();
        flag = true;
        break;

      case 'Down':
      case 'ArrowDown':
        if (this._filteredOptions.length > 0) {
          if (altKey) {
            this._open();
          } else {
            this._open();
            if (this._listboxHasVisualFocus || (this.autocomplete === 'both' && this._filteredOptions.length > 1)) {
              const nextOption = this._option ? this._getNextOption(this._option) : null;
              this._setOption(nextOption || this._firstOption, true);
              this._setVisualFocusListbox();
            } else {
              this._setOption(this._firstOption, true);
              this._setVisualFocusListbox();
            }
          }
        }
        flag = true;
        break;

      case 'Up':
      case 'ArrowUp':
        if (this._hasOptions()) {
          if (this._listboxHasVisualFocus && this._option) {
            const prevOption = this._getPreviousOption(this._option);
            this._setOption(prevOption, true);
          } else {
            this._open();
            if (!altKey) {
              this._setOption(this._lastOption, true);
              this._setVisualFocusListbox();
            }
          }
        }
        flag = true;
        break;

      case 'Esc':
      case 'Escape':
        if (this._isOpen) {
          this._close(true);
          const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
          if (inputNode) {
            this._filter = this._inputValue;
            this._filterOptions();
          }
          this._setVisualFocusCombobox();
        } else {
          this._setValue('');
          this._inputValue = '';
        }
        this._option = null;
        flag = true;
        break;

      case 'Tab':
        this._close(true);
        if (this._listboxHasVisualFocus) {
          if (this._option) {
            this._setValue(this._option.textContent?.trim() || '');
          }
        }
        break;

      case 'Home': {
        const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
        if (inputNode) {
          inputNode.setSelectionRange(0, 0);
        }
        flag = true;
        break;
      }

      case 'End': {
        const inputEndNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
        if (inputEndNode) {
          const length = inputEndNode.value.length;
          inputEndNode.setSelectionRange(length, length);
        }
        flag = true;
        break;
      }

      default:
        break;
    }

    if (flag) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  private _onComboboxKeyUp = (event: KeyboardEvent) => {
    let flag = false;
    let option: HTMLLIElement | null = null;
    const char = event.key;
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;

    if (!inputNode) {
      return;
    }

    if (this._isPrintableCharacter(char)) {
      this._filter += char;
    }

    // This is for the case when a selection in the textbox has been deleted
    if (this._inputValue.length < this._filter.length) {
      this._filter = this._inputValue;
      this._option = null;
      this._filterOptions();
    }

    if (event.key === 'Escape' || event.key === 'Esc') {
      return;
    }

    switch (event.key) {
      case 'Backspace':
        this._setVisualFocusCombobox();
        this._setCurrentOptionStyle(null);
        this._filter = this._inputValue;
        this._option = null;
        this._filterOptions();
        flag = true;
        break;

      case 'Left':
      case 'ArrowLeft':
      case 'Right':
      case 'ArrowRight':
      case 'Home':
      case 'End':
        if (this.autocomplete === 'both') {
          this._filter = this._inputValue;
        } else {
          this._option = null;
          this._setCurrentOptionStyle(null);
        }
        this._setVisualFocusCombobox();
        flag = true;
        break;

      default:
        if (this._isPrintableCharacter(char)) {
          this._setVisualFocusCombobox();
          this._setCurrentOptionStyle(null);
          flag = true;

          if (this.autocomplete === 'list' || this.autocomplete === 'both') {
            option = this._filterOptions();
            if (option) {
              if (!this._isOpen && this._inputValue.length) {
                this._open();
              }

              if (this._getLowercaseContent(option).indexOf(this._inputValue.toLowerCase()) === 0) {
                this._option = option;
                if (this.autocomplete === 'both' || this._listboxHasVisualFocus) {
                  this._setCurrentOptionStyle(option);
                  if (this.autocomplete === 'both') {
                    this._setOption(option);
                  }
                }
              } else {
                this._option = null;
                this._setCurrentOptionStyle(null);
              }
            } else {
              this._close();
              this._option = null;
              this._setActiveDescendant(null);
            }
          } else if (this._inputValue.length) {
            this._open();
          }
        }
        break;
    }

    if (flag) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  private _onComboboxClick = () => {
    if (this._isOpen) {
      this._close(true);
    } else {
      this._open();
    }
  };

  private _onComboboxFocus = () => {
    this._filter = this._inputValue;
    this._filterOptions();
    this._setVisualFocusCombobox();
    this._option = null;
    this._setCurrentOptionStyle(null);
  };

  private _onComboboxBlur = () => {
    this._removeVisualFocusAll();
  };

  private _onInputChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this._inputValue = target.value;
  };

  private _onBackgroundPointerUp = (event: PointerEvent) => {
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
    const listboxNode = this.renderRoot.querySelector(`#${this._listboxId}`) as HTMLUListElement;
    const buttonNode = this.renderRoot.querySelector(`#${this._buttonId}`) as HTMLButtonElement;

    if (
      inputNode &&
      listboxNode &&
      buttonNode &&
      !inputNode.contains(event.target as Node) &&
      !listboxNode.contains(event.target as Node) &&
      !buttonNode.contains(event.target as Node)
    ) {
      this._comboboxHasVisualFocus = false;
      this._setCurrentOptionStyle(null);
      this._removeVisualFocusAll();
      setTimeout(() => this._close(true), 300);
    }
  };

  private _onButtonClick = () => {
    if (this._isOpen) {
      this._close(true);
    } else {
      this._open();
    }
    const inputNode = this.renderRoot.querySelector(`#${this._inputId}`) as HTMLInputElement;
    if (inputNode) {
      inputNode.focus();
      this._setVisualFocusCombobox();
    }
  };

  private _onListboxPointerover = () => {
    this._hasHover = true;
  };

  private _onListboxPointerout = () => {
    this._hasHover = false;
    setTimeout(() => this._close(false), 300);
  };

  private _onOptionClick = (event: Event) => {
    const target = event.target as HTMLLIElement;
    if (target) {
      this._inputValue = target.textContent?.trim() || '';
      this._close(true);
    }
  };

  private _onOptionPointerover = () => {
    this._hasHover = true;
    this._open();
  };

  private _onOptionPointerout = () => {
    this._hasHover = false;
    setTimeout(() => this._close(false), 300);
  };

  override render() {
    return html`
      <label for="${this._inputId}" class="sr-only">${this.label}</label>
      <div class="combobox combobox-list">
        <div class="group">
          <input
            id="${this._inputId}"
            class="cb_edit dx-focus-ring"
            type="text"
            role="combobox"
            aria-autocomplete="${this.autocomplete}"
            aria-expanded="${this._isOpen ? 'true' : 'false'}"
            aria-controls="${this._listboxId}"
            .value="${this._inputValue.trim()}"
            @input="${this._onInputChange}"
            @keydown="${this._onComboboxKeyDown}"
            @keyup="${this._onComboboxKeyUp}"
            @click="${this._onComboboxClick}"
            @focus="${this._onComboboxFocus}"
            @blur="${this._onComboboxBlur}"
          />
          <button
            id="${this._buttonId}"
            tabindex="-1"
            aria-label="Options"
            aria-expanded="${this._isOpen ? 'true' : 'false'}"
            aria-controls="${this._listboxId}"
            @click="${this._onButtonClick}"
          >
            <dx-icon icon="ph--caret-down--regular"></dx-icon>
          </button>
        </div>
        <ul
          id="${this._listboxId}"
          role="listbox"
          aria-label="${this.label}"
          @pointerover="${this._onListboxPointerover}"
          @pointerout="${this._onListboxPointerout}"
          style="display: ${this._isOpen ? 'block' : 'none'}"
        >
          ${this._visibleOptions.map((option, index) => {
            const optionId = makeId(`${this._listboxId}-option-${index}`);
            return html`
              <li
                id="${optionId}"
                role="option"
                @click="${this._onOptionClick}"
                @pointerover="${this._onOptionPointerover}"
                @pointerout="${this._onOptionPointerout}"
              >
                ${option}
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  override createRenderRoot() {
    return this;
  }
}
