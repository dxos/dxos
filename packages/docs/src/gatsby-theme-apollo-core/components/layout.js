//
// Copyright 2020 DXOS.org
//

// Replace apollo-cores layout with our own
// https://github.com/apollographql/gatsby-theme-apollo/blob/master/packages/gatsby-theme-apollo-core/src/components/layout.js
import React from 'react';
import { Layout as SharedLayout } from '@dxos/docs-theme';
import { graphql, useStaticQuery } from 'gatsby';

export default function Layout ({ children }) {
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

  return <SharedLayout title={title} description={description}>
    {children}
  </SharedLayout>;
}
