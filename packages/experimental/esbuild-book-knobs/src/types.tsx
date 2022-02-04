//
// Copyright 2018 DXOS.org
//

export type SelectMap = { [index: string]: any }

export type NumberRange = { min: number, max: number, step?: number }

export function* range (min: number, max: number, step: number = 1) {
  yield min;
  if (min >= max) return;
  yield* range(parseFloat(Number(min + step).toPrecision(10)), max, step);
}

export interface Button {
  label: string
  onClick: () => void
}

export interface Select {
  label: string
  values: SelectMap
  defaultValue: any
  onChange: (value: any) => void
}

export interface Number {
  label: string
  range: NumberRange
  defaultValue: number
  onChange: (value: number) => void
}

export type KnobType = Button | Select | Number;
