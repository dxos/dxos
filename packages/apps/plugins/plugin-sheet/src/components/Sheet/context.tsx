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

import { type SheetRootProps } from './Sheet';
import { type CellPosition, type Range, posToA1Notation, posFromA1Notation, rangeToA1Notation } from './types';
import { type Formatting, type SheetType } from '../../types';

export type CellEvent = {
  type: string;
  cell: CellPosition;
  key?: string;
};

export type SheetContextType = {
  event: Event<CellEvent>;

  // Object.
  sheet: SheetType;
  readonly?: boolean;

  // Model value.
  getValue: (pos: CellPosition) => any;
  getEditableValue: (pos: CellPosition) => string;
  setValue: (pos: CellPosition, value: any) => void;

  // Current value being edited.
  text: string;
  getText: () => string;
  setText: (text: string) => void;

  // Selection.
  editing?: CellPosition;
  selected?: Range;
  setSelected: Dispatch<SetStateAction<{ editing?: CellPosition; selected?: Range }>>;

  bounds?: Bounds;
  setBounds: Dispatch<SetStateAction<Bounds | undefined>>;

  // Formatting.
  formatting: Record<string, Formatting>;
  setFormat: (range: Range, format: Formatting) => void;
};

const SheetContext = createContext<SheetContextType | null>(null);

export const useSheetContext = (): SheetContextType => {
  return useContext(SheetContext)!;
};

export const useSheetEvent = () => {
  const { event } = useSheetContext();
  return event;
};

// TODO(burdon): AM and non-AM accessor.
export const useSheetCellAccessor = (pos: CellPosition): DocAccessor<SheetType> => {
  const { sheet } = useSheetContext();
  return useMemo(() => createDocAccessor(sheet, ['cells', posToA1Notation(pos), 'value']), []);
};

export type CellValue = string | number | undefined;

export type Bounds = {
  from?: { cell: CellPosition; style: CSSProperties };
  to?: { cell: CellPosition; style: CSSProperties };
};

export const SheetContextProvider = ({ children, readonly, sheet }: PropsWithChildren<SheetRootProps>) => {
  const [event] = useState(new Event<CellEvent>());
  const [{ editing, selected }, setSelected] = useState<{ editing?: CellPosition; selected?: Range }>({});
  const [bounds, setBounds] = useState<Bounds>();

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

  const getValue = (pos: CellPosition): any => {
    const value = hf.getCellValue({ sheet: sheetId, row: pos.row, col: pos.column });
    if (value instanceof DetailedCellError) {
      // TODO(burdon): Format error.
      return value.toString();
    }

    return value;
  };

  const getEditableValue = (pos: CellPosition): string => {
    const formula = hf.getCellFormula({ sheet: sheetId, row: pos.row, col: pos.column });
    const value = formula ?? getValue(pos);
    return value?.toString();
  };

  const setValue = (pos: CellPosition, value: any) => {
    if (readonly) {
      return;
    }

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

  // Styles.
  const [formatting, setFormatting] = useState<Record<string, Formatting>>({});
  const setFormat = (range: Range, value: Formatting) => {
    const key = rangeToA1Notation(range);
    setFormatting((formatting) => ({ ...formatting, [key]: value }));
  };

  return (
    <SheetContext.Provider
      value={{
        event,
        sheet,
        readonly,
        getValue,
        getEditableValue,
        setValue,
        text,
        getText,
        setText,
        editing,
        selected,
        setSelected,
        bounds,
        setBounds,
        formatting,
        setFormat,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};
