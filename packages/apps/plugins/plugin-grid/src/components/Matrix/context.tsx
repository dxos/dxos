//
// Copyright 2024 DXOS.org
//

import React, {
  type CSSProperties,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from 'react';

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';

// TODO(burdon): Experiment with https://github.com/handsontable/hyperformula
// TODO(burdon): Store ranges.

const MAX_COLUMNS = 26 * 26;
const MAX_ROWS = 1_000;

export type Pos = { x: number; y: number };
export const posEquals = (a: Pos | undefined, b: Pos | undefined) => a?.x === b?.x && a?.y === b?.y;

type ValueMap = Record<string, any>;
export const posToString = ({ x, y }: Pos): string => {
  invariant(x < MAX_COLUMNS, `Invalid column: ${x}`);
  invariant(y < MAX_ROWS, `Invalid row: ${y}`);
  const col =
    (x >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(x / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (x % 26));
  return `${col}${y + 1}`;
};

export type CellEvent = {
  type: string;
  pos: Pos;
  key?: string;
};

export type MatrixContextType = {
  event: Event<CellEvent>;

  // Model value.
  getValue: (pos: Pos) => any;
  setValue: (pos: Pos, value: any) => void;

  // Current value being edited.
  text: string;
  getText: () => string;
  setText: (text: string) => void;
  editing?: Pos;
  setEditing: Dispatch<SetStateAction<Pos | undefined>>;

  // TODO(burdon): Selection range.
  selected?: Pos;
  setSelected: Dispatch<SetStateAction<Pos | undefined>>;
  outline?: CSSProperties;
  setOutline: Dispatch<SetStateAction<CSSProperties | undefined>>;

  debug: () => any;
};

const MatrixContext = createContext<MatrixContextType | null>(null);

export const useMatrixContext = (): MatrixContextType => {
  return useContext(MatrixContext)!;
};

export const useMatrixEvent = () => {
  const { event } = useMatrixContext();
  return event;
};

export const MatrixContextProvider = ({ children }: PropsWithChildren) => {
  const [event] = useState(new Event<CellEvent>());
  const [editing, setEditing] = useState<Pos>();
  const [selected, setSelected] = useState<Pos>();
  const [outline, setOutline] = useState<CSSProperties>();

  // TODO(burdon): Hack for stale text. Change to AM document.
  const [values, setValues] = useState<ValueMap>({ A1: 'Apple' });
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  const getValue = (pos: Pos) => valuesRef.current[posToString(pos)];
  const setValue = (pos: Pos, value: any) => setValues((values) => ({ ...values, [posToString(pos)]: value }));

  // TODO(burdon): Hack for stale text.
  const [text, setText] = useState('');
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const getText = () => textRef.current ?? '';

  const debug = () => ({
    selected: selected ? posToString(selected) : undefined,
    editing: editing ? posToString(editing) : undefined,
    values,
    text,
  });

  return (
    <MatrixContext.Provider
      value={{
        event,
        getValue,
        setValue,
        text,
        getText,
        setText,
        editing,
        setEditing,
        selected,
        setSelected,
        outline,
        setOutline,
        debug,
      }}
    >
      {children}
    </MatrixContext.Provider>
  );
};
