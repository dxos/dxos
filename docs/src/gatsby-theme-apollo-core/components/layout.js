//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { graphql, useStaticQuery } from 'gatsby';

import { Layout as SharedLayout } from '@dxos/docs-theme';

const Layout = ({ children }) => {
  const data = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          title
          description
        }
      }
    }
  `);

  const { title, description } = data.site.siteMetadata;

  return (
    <SharedLayout title={title} description={description}>
      {children}
    </SharedLayout>
  );
};

export default Layout;
