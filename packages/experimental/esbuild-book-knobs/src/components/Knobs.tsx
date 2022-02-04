//
// Copyright 2018 DXOS.org
//

import React, { MutableRefObject, forwardRef } from 'react';
import { css } from '@emotion/css';

import { Button, Number, Select, range } from '../types';
import { useKnobs } from '../hooks';

const styles = css`
  position: absolute;
  right: 0;
`;

interface KnobsProps {
  className?: string
}

export const Knobs = forwardRef<HTMLDivElement, KnobsProps>(({ className = styles }: KnobsProps,
  ref: MutableRefObject<HTMLDivElement>
) => {
  const [knobs] = useKnobs();

  return (
    <div
      ref={ref}
      className={className}
    >
      {knobs.map(([type, options], i) => {
        switch (type) {
          case 'button': {
            const { label, onClick } = options as Button;
            return (
              <button key={i} onClick={onClick}>
                {label}
              </button>
            );
          }

          case 'select': {
            const { label, values, defaultValue, onChange } = options as Select;
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
            const { label, range: { min, max, step = 1 }, defaultValue, onChange } = options as Number;
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
