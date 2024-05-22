//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Chess } from './Chess';

const ChessArticle: React.FC<React.ComponentProps<typeof Chess>> = (props) => {
  return (
    <div role='none' className='row-span-2 is-full overflow-auto'>
      <Chess {...props} />
    </div>
  );
};

export default ChessArticle;
