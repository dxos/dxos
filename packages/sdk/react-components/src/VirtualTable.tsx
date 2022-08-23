//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import React, { ReactNode, RefObject, memo, useEffect, useRef, useState } from 'react';

import {
  ArrowUpward as UpIcon,
  ArrowDownward as Downicon
} from '@mui/icons-material';
import {
  Box, IconButton, Table, TableCell, TableContainer, TableBody, TableHead, TableRow
} from '@mui/material';
// code import isEqualWith from 'lodash.isequalwith';

const log = debug('dxos:console:virtual-table');

// TODO(burdon): See https://github.com/bvaughn/react-window (rewrite of react-virtualized).

//
// Data.
//

export type RowData = { [index: string]: any }

interface Column {
  key: string
  title?: string
  width?: number
  sortable?: boolean
}

interface Row {
  key: string
  data: RowData
  top: number
  height: number
}

type SortDirection = 'up' | 'down' | undefined

//
// Table Header.
//

interface HeaderCellProps {
  column: Column
  sortDirection?: SortDirection,
  onSort: (sort: SortDirection) => void
}

const HeaderCell = ({ column: { key, title, width, sortable }, sortDirection, onSort }: HeaderCellProps) => {
  const handleSort = () => {
    onSort((sortDirection === 'up') ? 'down' : (sortDirection === 'down') ? undefined : 'up');
  };

  return (
    <TableCell
      sx={{
        width,
        maxWidth: width,
        flex: width === undefined ? 1 : 0,
        flexShrink: 0,
        padding: 0,
        cursor: 'pointer'
      }}
    >
      <Box sx={{ display: 'flex' }} onClick={sortable ? handleSort : undefined}>
        <Box
          sx={{
            flex: 1,
            padding: 1,
            paddingLeft: 2,
            paddingRight: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            WebkitUserSelect: 'none'
          }}>
          {title || key}
        </Box>
        {sortable && sortDirection && (
          <IconButton size='small'>
            {(sortDirection === 'up' && (
              <UpIcon />
            )) || (
              <Downicon />
            )}
          </IconButton>
        )}
      </Box>
    </TableCell>
  );
};

//
// Table Cell.
//

const rowHeight = 42;

export interface DataCellProps {
  column: Column
  key: string
  row: RowData
  height: number
  rowSelected: boolean
  getValue: (data: RowData, key: string) => any
  value: any
}

export const DefaultTableCell = ({ children }: { children: ReactNode }): JSX.Element => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: rowHeight
    }}
  >
    {children}
  </Box>
);

interface VirtualTableCellProps {
  column: Column
  key: string
  row: RowData
  rowSelected: boolean
  getValue: (data: RowData, key: string) => any
  renderCell?: (props: DataCellProps) => JSX.Element | undefined
  height: number
}

const VirtualTableCell = ({ column, row, height, renderCell, rowSelected, getValue }: VirtualTableCellProps) => {
  const { key, width } = column;
  const value = getValue(row, key);
  const props: DataCellProps = { column, key, row, height, rowSelected, getValue, value };

  let component = renderCell!(props);
  if (!component) {
    component = (
      <DefaultTableCell>
        <span>{value}</span>
      </DefaultTableCell>
    );
  }

  return (
    <TableCell
      key={key}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: width,
        flex: width === undefined ? 1 : 0,
        flexShrink: 0,
        height,
        padding: 0,
        paddingLeft: 2,
        paddingRight: 2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        lineHeight: 1.5
      }}
    >
      {component}
    </TableCell>
  );
};

//
// Table Row.
//

interface VirtualTableRowProps {
  row: Row
  columns: Column[]
  getValue: (data: RowData, key: string) => any
  selected: boolean
  handleSelect: (key: string) => void
  renderCell?: (props: DataCellProps) => JSX.Element | undefined
}

const VirtualTableRow = ({ row, columns, selected, handleSelect, getValue, renderCell }: VirtualTableRowProps) => {
  const { key, data, top, height } = row;

  log('Render', row.key);

  return (
    <TableRow
      hover
      selected={selected}
      sx={{
        display: 'flex',
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        height,
        overflow: 'hidden'
      }}
      onClick={() => handleSelect(key)}
    >
      {columns.map((column) => (
        <VirtualTableCell
          key={column.key}
          column={column}
          row={data}
          height={height}
          getValue={getValue}
          renderCell={renderCell}
          rowSelected={selected}
        />
      ))}
    </TableRow>
  );
};

// Memoize row so that it is not updated on each scroll event.
// https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-shouldcomponentupdate
const MemoVirtualTableRow = memo(VirtualTableRow, (oldProps, newProps) => {
  // Layout changed.
  if (oldProps.row.top !== newProps.row.top || oldProps.row.height !== newProps.row.height) {
    log('Changed layout', oldProps.row.key);
    return false;
  }

  // Selection changed.
  if (oldProps.selected !== newProps.selected) {
    log('Changed selection', oldProps.row.key, oldProps.selected, newProps.selected);
    return false;
  }

  // Shallow compare data.
  // https://lodash.com/docs/4.17.15#isEqualWith
  // code if (isEqualWith(oldProps.row.data, newProps.row.data, (/* oldValue, newValue */) => {})) {
  // code   log('Changed data', oldProps.row.key);
  // code   return false;
  // code }

  return true; // Skip render.
});

//
// Scroll handler.
//

interface ScrollState {
  clientHeight: number
  scrollHeight: number
  scrollTop: number
}

const useScrollHandler = (scrollContainerRef: RefObject<HTMLDivElement>): [ScrollState, () => void] => {
  const [scrollState, setScrollState] = useState<ScrollState>({
    clientHeight: 0, scrollHeight: 0, scrollTop: 0
  });

  const handleUpdate = () => {
    const { clientHeight = 0, scrollHeight = 0, scrollTop = 0 } = scrollContainerRef.current || {};
    setScrollState({ clientHeight, scrollHeight, scrollTop });
  };

  useEffect(() => {
    window.addEventListener('resize', handleUpdate);
    scrollContainerRef.current!.addEventListener('scroll', handleUpdate);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      scrollContainerRef.current?.removeEventListener('scroll', handleUpdate);
    };
  }, [scrollContainerRef]);

  // Update on first render.
  useEffect(handleUpdate, []);

  return [scrollState, handleUpdate];
};

//
// Table.
//

export type SelectionModel = string[]

export interface GetRowHeightProps {
  row: RowData
  i: number
  rowSelected: boolean
}

const defaultRowHeight = () => rowHeight;
const defaultValue = (data: RowData, key: string) => data[key];

export interface VirtualTableProps<T> {
  rows?: T[]
  selected?: SelectionModel
  onSelect?: (selected: SelectionModel) => void
  columns: Column[]
  getRowKey: (row: RowData) => string
  getRowHeight?: (props: GetRowHeightProps) => number
  getValue?: (data: RowData, key: string) => any
  renderCell?: (props: DataCellProps) => JSX.Element | undefined
}

// TODO(burdon): Side/bottom master/detail.
// TODO(burdon): Column filter.
// TODO(burdon): Request more data callback.
// TODO(burdon): Paging (vs virtual scroll).
export const VirtualTable = <T extends RowData> (
  {
    rows: dataRows = [],
    selected: controlledSelected = [],
    onSelect,
    columns = [],
    getRowKey,
    getRowHeight = defaultRowHeight,
    getValue = defaultValue,
    renderCell
  }: VirtualTableProps<T>
) => {
  //
  // Sorting.
  //
  const [{ sortKey, sortDirection }, setSort] = useState<{ sortKey?: string, sortDirection?: SortDirection }>({});
  const handleSort = (sortKey: string, sortDirection: SortDirection) => setSort({ sortKey, sortDirection });

  //
  // Selection.
  // https://mui.com/components/tables/#sorting-amp-selecting
  // TODO(burdon): Scroll to same position (if selection above collapses).
  // TODO(burdon): Options for single select and toggle select.
  //
  const [controlledSelection, setControlledSelection] = useState<SelectionModel>([]);
  useEffect(() => setControlledSelection(controlledSelected), [controlledSelected]);
  const handleSelect = (selected: string) => {
    if (onSelect) {
      onSelect([selected]);
    } else {
      setControlledSelection([selected]);
    }
  };

  //
  // Do layout and cache positions.
  //
  const [{ height, sortedRows }, setProps] = useState<{ height: number, sortedRows: Row[] }>({ height: 0, sortedRows: [] });
  useEffect(() => {
    const ts = Date.now();

    //
    // Sort.
    // TODO(burdon): Skip if data didn't change.
    //
    const rows = [...dataRows];
    if (sortKey && sortDirection) {
      rows.sort((v1: RowData, v2: RowData) => {
        const d1 = getValue(v1, sortKey);
        const d2 = getValue(v2, sortKey);
        return (d1 < d2 ? -1 : d1 > d2 ? 1 : 0) * (sortDirection === 'up' ? 1 : -1);
      });
    }

    //
    // Do layout.
    //
    const sortedRows: Row[] = [];
    const height = rows.reduce((h, row, i) => {
      const key = getRowKey(row);
      const rowSelected = !!controlledSelection.find(s => s === key);
      const rowHeight = getRowHeight({ i, row, rowSelected });
      sortedRows.push({ key, data: row, top: h, height: rowHeight });
      return h + rowHeight;
    }, 0);

    log('Layout', Date.now() - ts);
    setProps({ height, sortedRows });
  }, [dataRows, sortKey, sortDirection, controlledSelection]);

  //
  // Set visible range.
  //
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState] = useScrollHandler(scrollContainerRef);
  const [range, setRange] = useState<{ start: number, end: number, rows: Row[] }>({ start: 0, end: 0, rows: [] });
  useEffect(() => {
    const { clientHeight, scrollTop } = scrollState;

    let first = 0;
    let last = 0;
    sortedRows.forEach(({ top }, i) => {
      if (scrollTop > top) {
        first = i;
      } else if ((scrollTop + clientHeight) > top) {
        last = i;
      }
    });

    // Configure num rows before/after that are rendered.
    const overscan = 10;
    const start = Math.max(0, first - overscan);
    const end = Math.min(sortedRows.length - 1, last + overscan);
    setRange({ start, end, rows: sortedRows.slice(start, end + 1) });
  }, [sortedRows, scrollState]);

  const TableFooter = ({ rows }: { rows: T[] }) => (
    <Box
      sx={{
        display: 'flex',
        flexShrink: 0,
        justifyContent: 'center'
      }}
    >
      {`${rows.length} rows`}
    </Box>
  );

  // TODO(burdon): Not working on mobile.

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden'
      }}
    >
      <TableContainer
        ref={scrollContainerRef}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <Table
          stickyHeader
        >
          {/* Columns. */}
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <HeaderCell
                  key={column.key}
                  column={column}
                  sortDirection={sortKey === column.key ? sortDirection : undefined}
                  onSort={sortDirection => handleSort(column.key, sortDirection)}
                />
              ))}
            </TableRow>
          </TableHead>

          {/* Data rows. */}
          <TableBody
            sx={{
              position: 'relative', // Anchor for layout.
              height
            }}
          >
            {range.rows.map(row => {
              const rowSelected = !!controlledSelection.find(s => s === row.key);

              return (
                <MemoVirtualTableRow
                  key={row.key}
                  row={row}
                  columns={columns}
                  getValue={getValue}
                  selected={rowSelected}
                  handleSelect={handleSelect}
                  renderCell={renderCell}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer. */}
      <TableFooter
        rows={dataRows}
      />
    </Box>
  );
};
