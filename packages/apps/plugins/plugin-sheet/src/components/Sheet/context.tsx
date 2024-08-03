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
  useMemo,
} from 'react';

import { Event } from '@dxos/async';
import { createDocAccessor, type DocAccessor } from '@dxos/client/echo';

import { type Pos, type Range, rangeToA1Notation, posToA1Notation, posFromA1Notation } from './types';
import { type SheetType } from '../../types';

export type CellEvent = {
  type: string;
  pos: Pos;
  key?: string;
};

export type MatrixContextType = {
  event: Event<CellEvent>;

  // Object.
  sheet: SheetType;

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

// TODO(burdon): AM and non-AM accessor.
export const useMatrixCellAccessor = (pos: Pos): DocAccessor<SheetType> => {
  const { sheet } = useMatrixContext();
  return useMemo(() => createDocAccessor(sheet, ['cells', posToA1Notation(pos), 'value']), []);
};

export type CellValue = string | number | undefined;

export const MatrixContextProvider = ({ children, sheet }: PropsWithChildren<{ sheet: SheetType }>) => {
  const [event] = useState(new Event<CellEvent>());
  const [{ editing, selected }, setSelected] = useState<{ editing?: Pos; selected?: Range }>({});
  const [outline, setOutline] = useState<CSSProperties>();

  // TODO(burdon): Factor out model.
  // TODO(burdon): Change to AM document for store.
  // TODO(burdon): Store formating metadata.
  // TODO(burdon): Update ranges when inserting/moving/deleting rows and columns (not absolute).
  // https://github.com/handsontable/hyperformula
  const [, forceUpdate] = useState({});
  const [{ hf, sheetId }] = useState(() => {
    // TODO(burdon): Factor out to separate repo?
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    const sheetId = hf.getSheetId(hf.addSheet('Test'))!;
    return { hf, sheetId };
  });

  // TODO(burdon): Fine-grain listen for updates.
  useEffect(() => {
    const accessor = createDocAccessor(sheet, ['cells']);
    const onUpdate = () => {
      Object.entries(sheet.cells).forEach(([key, { value }]) => {
        const { column, row } = posFromA1Notation(key);
        hf.setCellContents({ sheet: sheetId, row, col: column }, value);
      });
    };

    accessor.handle.addListener('change', onUpdate);
    onUpdate();
    return () => accessor.handle.removeListener('change', onUpdate);
  }, []);

  const getValue = (pos: Pos): any => {
    const value = hf.getCellValue({ sheet: sheetId, row: pos.row, col: pos.column });
    if (value instanceof DetailedCellError) {
      // TODO(burdon): Format error.
      return value.toString();
    }

    return value;
  };

  const getEditableValue = (pos: Pos): string => {
    const formula = hf.getCellFormula({ sheet: sheetId, row: pos.row, col: pos.column });
    const value = formula ?? getValue(pos);
    return value?.toString();
  };

  const setValue = (pos: Pos, value: any) => {
    hf.setCellContents({ sheet: sheetId, row: pos.row, col: pos.column }, [[value]]);
    const cell = posToA1Notation(pos);
    if (value === undefined) {
      delete sheet.cells[cell];
    } else {
      sheet.cells[cell] = { value };
    }

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
        sheet,
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
