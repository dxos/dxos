//
// Copyright 2018 DXOS.org
//

import React, { MutableRefObject, createContext, forwardRef, useContext, useEffect, useState } from 'react';

// TODO(burdon): Create esbuild-server lib. (@dxos/esbuild-book-knobs); create lerna project.

type SelectMap = { [index: string]: any }

type NumberRange = { min: number, max: number, inc?: number }

function* range (min: number, max: number, inc: number = 1) {
  yield min;
  if (min >= max) return;
  yield* range(min + inc, max, inc);
}

interface Button {
  label: string
  onClick: () => void
}

interface Select {
  label: string
  values: SelectMap
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
  className
}: KnobsProps,
  ref: MutableRefObject<HTMLDivElement>
) => {
  const { knobs } = useContext(KnobContext);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        padding: 8
      }}
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
            const { label, values, onChange } = knob as Select;
            return (
              <select key={i} onChange={(event) => {
                onChange(event.target.value !== '' ? values[event.target.value] : undefined);
              }}>
                <option value=''>{label.toUpperCase()}</option>
                {Object.keys(values).map(key => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            )
          }

          case 'number': {
            const { label, range: { min, max, inc = 1 }, defaultValue, onChange } = knob as Number;
            return (
              <select key={i} onChange={(event) => {
                onChange(event.target.value !== '' ? parseInt(event.target.value) : defaultValue);
              }}>
                <option value=''>{label.toUpperCase()}</option>
                {[...range(min, max, inc)].map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
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

export const useSelect = (label: string, values: SelectMap) => {
  const [value, setValue] = useState(values[Object.keys(values)[0]]);
  const controller = useContext(KnobContext);
  useEffect(() => {
    controller.addKnob('select', { label, values, onChange: value => setValue(value)} as Select)
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
