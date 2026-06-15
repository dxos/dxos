//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import { describe, it } from 'vitest';

import { createPieceMap } from './chess';

describe('ChessModel', () => {
  it('should update pieces', ({ expect }) => {
    const chess = new ChessJS();
    chess.loadPgn(
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 *',
    );
    const pieces = createPieceMap(chess);
    expect(pieces).to.exist;
  });
});
