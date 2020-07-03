//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { Logo as SharedLogo } from '@dxos/docs-theme';
import { useStaticQuery, graphql } from 'gatsby';

const query = graphql`
  query {
    logoImage: file(relativePath: { eq: "full-logo.png" }) {
      childImageSharp {
        fixed(width: 120, height: 39) {
          ...GatsbyImageSharpFixed_noBase64 # suffixed with _noBase64 to prevent the blur-up on the logo
        }
      }
    }
  }
`;

export default function Logo () {
  const { logoImage } = useStaticQuery(query);

  return <SharedLogo logoImage={logoImage}/>;
}
