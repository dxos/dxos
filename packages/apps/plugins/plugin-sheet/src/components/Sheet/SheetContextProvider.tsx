//
// Copyright 2024 DXOS.org
//

import React, {
  type Dispatch,
  type KeyboardEvent,
  type PropsWithChildren,
  type SetStateAction,
  type SyntheticEvent,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type GridOnScrollProps } from 'react-window';

import { Event } from '@dxos/async';
import { createDocAccessor, type DocAccessor } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { type SheetRootProps } from './Sheet';
import { type CellPosition, type CellRange, cellToA1Notation, rangeToA1Notation } from '../../model';
import { SheetModel } from '../../model';
import { type Formatting, type SheetType } from '../../types';

export type CellEvent = {
  cell: CellPosition;
  source?: SyntheticEvent<HTMLElement>;
};

export const getKeyboardEvent = (ev: CellEvent) => {
  invariant(ev.source);
  return ev.source as KeyboardEvent<HTMLInputElement>;
};

export type SheetContextType = {
  event: Event<CellEvent>;

  // Object.
  sheet: SheetType;
  model: SheetModel;

  // Current value being edited.
  text: string;
  getText: () => string;
  setText: (text: string) => void;

  // Selection.
  editing?: CellPosition;
  selected?: CellRange;
  setSelected: Dispatch<SetStateAction<{ editing?: CellPosition; selected?: CellRange }>>;

  // Formatting.
  formatting: Record<string, Formatting>;
  setFormat: (range: CellRange, format: Formatting) => void;

  // Scroll callback.
  scrollProps: GridOnScrollProps | undefined;
  setScrollProps: (props: GridOnScrollProps) => void;
};

const SheetContext = createContext<SheetContextType | null>(null);

export const useSheetContext = (): SheetContextType => {
  return useContext(SheetContext)!;
};

export const useSheetEvent = () => {
  const { event } = useSheetContext();
  return event;
};

// TODO(burdon): AM and non-AM accessor?
export const useSheetCellAccessor = (pos: CellPosition): DocAccessor<SheetType> => {
  const { sheet } = useSheetContext();
  return useMemo(() => createDocAccessor(sheet, ['cells', cellToA1Notation(pos), 'value']), []);
};

export const SheetContextProvider = ({ children, readonly, sheet }: PropsWithChildren<SheetRootProps>) => {
  const [event] = useState(new Event<CellEvent>());
  const [{ editing, selected }, setSelected] = useState<{ editing?: CellPosition; selected?: CellRange }>({});
  const [model] = useState(new SheetModel(sheet, { readonly }));

  // TODO(burdon): Track scroll state for overlay.
  const [scrollProps, setScrollProps] = useState<GridOnScrollProps>();

  // Editable text.
  const [text, setText] = useState<string>('');
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const getText = () => textRef.current ?? '';

  // Styles.
  const [formatting, setFormatting] = useState<Record<string, Formatting>>({});
  const setFormat = (range: CellRange, value: Formatting) => {
    const key = rangeToA1Notation(range);
    setFormatting((formatting) => ({ ...formatting, [key]: value }));
  };

  return (
    <SheetContext.Provider
      value={{
        event,
        sheet,
        model,
        text,
        getText,
        setText,
        editing,
        selected,
        setSelected,
        formatting,
        setFormat,
        scrollProps,
        setScrollProps,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};
