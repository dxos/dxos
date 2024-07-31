//
// Copyright 2024 DXOS.org
//

import React, {
  type CSSProperties,
  type Dispatch,
  type DOMAttributes,
  type FC,
  type PropsWithChildren,
  type SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { FixedSizeGrid as Grid } from 'react-window';

import { invariant } from '@dxos/invariant';
import { groupSurface, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Experiment with https://github.com/handsontable/hyperformula

const MAX_COLUMNS = 26 * 26;
const MAX_ROWS = 1_000;

type Pos = { x: number; y: number };
const posEquals = (a: Pos | undefined, b: Pos | undefined) => a?.x === b?.x && a?.y === b?.y;

type ValueMap = Record<string, any>;
const posToString = ({ x, y }: Pos): string => {
  invariant(x < MAX_COLUMNS, `Invalid column: ${x}`);
  invariant(y < MAX_ROWS, `Invalid row: ${y}`);
  const col =
    (x >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(x / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (x % 26));
  return `${col}${y + 1}`;
};

type MatrixContextType = {
  getValue: (pos: Pos) => any;
  setValue: (pos: Pos, value: any) => void;
  // TODO(burdon): Selection range.
  selected?: Pos;
  setSelected: Dispatch<SetStateAction<Pos | undefined>>;
  editing?: Pos;
  setEditing: Dispatch<SetStateAction<Pos | undefined>>;
};

const MatrixContext = createContext<MatrixContextType | null>(null);

const MatrixContextProvider = ({ children }: PropsWithChildren) => {
  const [values, setValues] = useState<ValueMap>({});
  const getValue = (pos: Pos) => values[posToString(pos)];
  const setValue = (pos: Pos, value: any) => setValues({ ...values, [posToString(pos)]: value });
  const [selected, setSelected] = useState<Pos>();
  const [editing, setEditing] = useState<Pos>();

  return (
    <MatrixContext.Provider value={{ selected, setSelected, editing, setEditing, getValue, setValue }}>
      {children}
    </MatrixContext.Provider>
  );
};

// TODO(burdon): Save pending values when scroll out of view.
const Cell: FC<{ columnIndex: number; rowIndex: number; style: CSSProperties }> = ({
  columnIndex,
  rowIndex,
  style,
}) => {
  const pos: Pos = { x: columnIndex, y: rowIndex };
  const { selected, setSelected, editing, setEditing, getValue, setValue } = useContext(MatrixContext)!;
  const isSelected = posEquals(selected, pos);
  const isEditing = posEquals(editing, pos);
  const [text, setText] = useState<string>();
  useEffect(() => {
    // setText(getValue(pos));
    setText(posToString(pos));
  }, []);

  const handleSelect = () => {
    setSelected({ x: columnIndex, y: rowIndex });
    setEditing({ x: columnIndex, y: rowIndex });
  };

  const handleKeyDown: DOMAttributes<HTMLDivElement>['onKeyDown'] = (ev) => {
    switch (ev.key) {
      case 'Enter': {
        setValue(pos, text);
        setEditing(undefined);
        break;
      }
      case 'Escape': {
        setEditing(undefined);
        setText(getValue(pos));
        break;
      }
    }
  };

  // TODO(burdon): Selection outline with z-index. Tab order, etc.
  return (
    <div className={mx('border-r border-b border-neutral-500')} style={style} onClick={handleSelect}>
      {(isEditing && (
        <input
          type='text'
          autoFocus
          className={mx(groupSurface, 'w-full p-[4px]')}
          value={text ?? ''}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={handleKeyDown}
        />
      )) || <div className={mx('w-full h-full p-[5px]', isSelected && !isEditing && 'outline')}>{text}</div>}
    </div>
  );
};

/**
 * Virtual grid.
 */
export const Matrix = () => {
  const { ref, width = 0, height = 0 } = useResizeDetector();

  // TODO(burdon): Resize individual columns/rows.
  return (
    <div ref={ref} className='flex grow border-l border-t border-neutral-500'>
      <MatrixContextProvider>
        <Grid columnCount={50} rowCount={200} columnWidth={200} rowHeight={35} width={width} height={height}>
          {Cell}
        </Grid>
      </MatrixContextProvider>
    </div>
  );
};
