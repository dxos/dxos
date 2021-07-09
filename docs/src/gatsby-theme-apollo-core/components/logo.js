//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { useStaticQuery, graphql } from 'gatsby';

import { Logo as SharedLogo } from '@dxos/docs-theme';

const query = graphql`
  query {
    logoImage: file(relativePath: { eq: "full-logo.png" }) {
      childImageSharp {
        fixed(width: 191, height: 39) {
          ...GatsbyImageSharpFixed_noBase64 # suffixed with _noBase64 to prevent the blur-up on the logo
        }
      }
    }
  }
`;

const Logo = () => {
  const { logoImage } = useStaticQuery(query);

  return <SharedLogo logoImage={logoImage} />;
};

export default Logo;

