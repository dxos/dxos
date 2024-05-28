//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Chess } from './Chess';

const ChessArticle: React.FC<React.ComponentProps<typeof Chess>> = (props) => {
  return (
    <div role='none' className='flex flex-col justify-center row-span-2 is-full overflow-auto'>
      <Chess {...props} />
    </div>
  );
};

export default ChessArticle;
