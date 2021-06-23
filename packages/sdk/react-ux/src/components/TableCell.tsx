//
// Copyright 2021 DXOS.org
//

import { withStyles } from '@material-ui/core';
import MuiTableCell from '@material-ui/core/TableCell';

const TableCell = withStyles((theme) => ({
  root: {
    borderBottom: 'none',
    padding: 0,
    paddingBottom: theme.spacing(0.5)
  }
}))(MuiTableCell);

export default TableCell;
