//
// Copyright 2020 DXOS.org
//

/* global preval */
import React from 'react';

// TODO(burdon): ???
// ISSUE: https://github.com/dxos/website/issues/160
import SharedSocialCard from '@dxos/docs-theme/src/components/SocialCard';

const { fonts, image } = preval`
  const fs = require('fs');
  const path = require('path');
  function getBase64(path) {
    const fontPath = require.resolve('source-sans-pro/' + path);
    const base64Font = fs.readFileSync(fontPath, 'base64');
    return 'data:application/x-font-woff;charset=utf-8;base64,' + base64Font;
  }
  const base64Regular = getBase64('/WOFF2/TTF/SourceSansPro-Regular.ttf.woff2');
  const base64Semibold = getBase64('/WOFF2/TTF/SourceSansPro-Semibold.ttf.woff2');
  const cssPath = require.resolve('source-sans-pro/source-sans-pro.css');
  const fonts = fs
    .readFileSync(cssPath, 'utf-8')
    .replace('WOFF2/TTF/SourceSansPro-Regular.ttf.woff2', base64Regular)
    .replace('WOFF2/TTF/SourceSansPro-Semibold.ttf.woff2', base64Semibold);
  const imagePath = path.resolve(__dirname, '../assets/social-bg.jpg');
  const base64Image = fs.readFileSync(imagePath, 'base64');
  module.exports = {
    fonts,
    image: 'data:image/jpeg;base64,' + base64Image
  };
`;

const SocialCard = (props) => {
  return (
    <SharedSocialCard {...props} fonts={fonts} image={image} />
  );
};

export default SocialCard;
