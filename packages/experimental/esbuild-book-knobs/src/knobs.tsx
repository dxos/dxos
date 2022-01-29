//
// Copyright 2018 DXOS.org
//

import React, { MutableRefObject, createContext, forwardRef, useContext, useEffect, useState } from 'react';
import { css } from '@emotion/css';

const styles = css`
  position: absolute;
  right: 0;
`;

type SelectMap = { [index: string]: any }

type NumberRange = { min: number, max: number, step?: number }

function* range (min: number, max: number, step: number = 1) {
  yield min;
  if (min >= max) return;
  yield* range(parseFloat(Number(min + step).toPrecision(10)), max, step);
}

interface Button {
  label: string
  onClick: () => void
}

interface Select {
  label: string
  values: SelectMap
  defaultValue: any
  onChange: (value: any) => void
}

interface Number {
  label: string
  range: NumberRange
  defaultValue: number
  onChange: (value: number) => void
}

type KnobType = Button | Select | Number;

class KnobsController {
  private _knobs: [string, KnobType][];

  get knobs () {
    return this._knobs ?? [];
  }

  initialize () {
    this._knobs = [];
  }

  addKnob (type: string, knob: KnobType) {
    if (!this._knobs) {
      throw new Error('Not initialized: call useKnobs before any other hooks.');
    }

    this._knobs.push([type, knob]);
  }
}

// TODO(burdon): Does not get reset when nav back to story. Inject context in ESBook?
export const KnobContext = createContext(new KnobsController());

interface KnobsProps {
  className?: string
}

export const Knobs = forwardRef<HTMLDivElement, KnobsProps>(({
  className = styles
}: KnobsProps,
  ref: MutableRefObject<HTMLDivElement>
) => {
  const { knobs } = useContext(KnobContext);

  return (
    <div
      ref={ref}
      className={className}
    >
      {knobs.map(([type, knob], i) => {
        switch (type) {
          case 'button': {
            const { label, onClick } = knob as Button;
            return (
              <button key={i} onClick={onClick}>
                {label}
              </button>
            );
          }

          case 'select': {
            const { label, values, defaultValue, onChange } = knob as Select;
            return (
              <div key={i}>
                <label>{label.toUpperCase()}</label>
                <select value={defaultValue} onChange={(event) => {
                  onChange(event.target.value !== '' ? values[event.target.value] : undefined);
                }}>
                  {Object.keys(values).map(key => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            )
          }

          case 'number': {
            const { label, range: { min, max, step = 1 }, defaultValue, onChange } = knob as Number;
            return (
              <div key={i}>
                <label>{label.toUpperCase()}</label>
                <select value={defaultValue} onChange={(event) => {
                  onChange(event.target.value !== '' ? parseInt(event.target.value) : defaultValue);
                }}>
                  {[...range(min, max, step)].map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        }
      })}
    </div>
  );
});

//
// Hooks
//

// TODO(burdon): Hack to reset context.
export const useKnobs = () => {
  const controller = useContext(KnobContext);
  useEffect(() => {
    controller.initialize();
  }, []);

  return Knobs;
};

export const useButton = (label: string, onClick: () => void) => {
  const controller = useContext(KnobContext);
  useEffect(() => {
    controller.addKnob('button', { label, onClick } as Button)
  }, []);
};

export const useSelect = (label: string, values: SelectMap, defaultValue = undefined) => {
  const [value, setValue] = useState(values[Object.keys(values)[0]]);
  const controller = useContext(KnobContext);
  useEffect(() => {
    controller.addKnob('select', { label, values, defaultValue, onChange: value => setValue(value)} as Select)
  }, []);

  return value;
};

export const useNumber = (label: string, range: NumberRange, defaultValue: number = 0): number => {
  const [value, setValue] = useState(defaultValue);
  const controller = useContext(KnobContext);
  useEffect(() => {
    controller.addKnob('number', { label, range, defaultValue, onChange: (value: number) => setValue(value)} as Number)
  }, []);

  return value;
};
