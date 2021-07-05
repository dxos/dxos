//
// Copyright 2020 DXOS.org
//

import React from 'react';

// TODO(burdon): ???
// ISSUE: https://github.com/dxos/website/issues/160
import { PageContent as SharedPageContent } from '@dxos/docs-theme/dist/src/components/PageContent';

const PageContent = ({ children, ...rest }) => {
  return (
    <SharedPageContent {...rest}>
      {children}
    </SharedPageContent>
  );
};

export default PageContent;

