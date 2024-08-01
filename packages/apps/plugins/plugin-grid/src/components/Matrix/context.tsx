//
// Copyright 2024 DXOS.org
//

import { DetailedCellError, HyperFormula } from 'hyperformula';
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

import { type Pos, type Range, rangeToA1Notation, posToA1Notation } from './types';

export type CellEvent = {
  type: string;
  pos: Pos;
  key?: string;
};

export type MatrixContextType = {
  event: Event<CellEvent>;

  // Model value.
  getValue: (pos: Pos) => any;
  getEditableValue: (pos: Pos) => string;
  setValue: (pos: Pos, value: any) => void;

  // Current value being edited.
  text: string;
  getText: () => string;
  setText: (text: string) => void;

  // Selection.
  editing?: Pos;
  selected?: Range;
  setSelected: Dispatch<SetStateAction<{ editing?: Pos; selected?: Range }>>;

  outline?: CSSProperties;
  setOutline: Dispatch<SetStateAction<CSSProperties | undefined>>;

  getDebug: () => any;
};

const MatrixContext = createContext<MatrixContextType | null>(null);

export const useMatrixContext = (): MatrixContextType => {
  return useContext(MatrixContext)!;
};

export const useMatrixEvent = () => {
  const { event } = useMatrixContext();
  return event;
};

export type CellValue = string | number | undefined;

export const MatrixContextProvider = ({ children, data }: PropsWithChildren<{ data?: CellValue[][] }>) => {
  const [event] = useState(new Event<CellEvent>());
  const [{ editing, selected }, setSelected] = useState<{ editing?: Pos; selected?: Range }>({});
  const [outline, setOutline] = useState<CSSProperties>();

  // TODO(burdon): Factor out model.
  // TODO(burdon): Change to AM document for store.
  // TODO(burdon): Store formating metadata.
  // TODO(burdon): Update ranges when inserting/moving/deleting rows and columns (not absolute).
  // https://github.com/handsontable/hyperformula
  const [, forceUpdate] = useState({});
  const [{ hf, sheet }] = useState(() => {
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    const sheet = hf.getSheetId(hf.addSheet('Test'))!;
    if (data) {
      hf.setCellContents({ sheet, row: 0, col: 0 }, data);
    }

    return { hf, sheet };
  });

  const getValue = (pos: Pos): any => {
    const value = hf.getCellValue({ sheet, row: pos.row, col: pos.column });
    if (value instanceof DetailedCellError) {
      // TODO(burdon): Format error.
      return value.toString();
    }

    return value;
  };
  const getEditableValue = (pos: Pos): string => {
    const formula = hf.getCellFormula({ sheet, row: pos.row, col: pos.column });
    const value = formula ?? getValue(pos);
    return value?.toString();
  };
  const setValue = (pos: Pos, value: any) => {
    hf.setCellContents({ sheet, row: pos.row, col: pos.column }, [[value]]);
    forceUpdate({});
  };

  // Editable text.
  const [text, setText] = useState<string>('');
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const getText = () => textRef.current ?? '';

  const getDebug = () => ({
    selected: selected ? rangeToA1Notation(selected) : undefined,
    editing: editing ? posToA1Notation(editing) : undefined,
    text,
  });

  return (
    <MatrixContext.Provider
      value={{
        event,
        getValue,
        getEditableValue,
        setValue,
        text,
        getText,
        setText,
        editing,
        selected,
        setSelected,
        outline,
        setOutline,
        getDebug,
      }}
    >
      {children}
    </MatrixContext.Provider>
  );
};
