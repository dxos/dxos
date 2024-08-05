//
// Copyright 2024 DXOS.org
//

import { $applyNodeReplacement } from 'lexical';

import CodeNode from '../CodeNode';

export default (): CodeNode => $applyNodeReplacement(new CodeNode());
