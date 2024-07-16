//
// Copyright 2022 DXOS.org
//

module.exports = {
  // Packlets linting requires a package-specific tsconfig file and so cannot live in the root config.
  // Packages which need to use packlets can setup a local lint config within the package.
  // TODO(wittjosiah): Phase out usage?
  //   Nx recommends splitting into packages earlier to take more advantage of computation caching.
  //   https://nx.dev/structure/creating-libraries
  extends: ['plugin:@rushstack/eslint-plugin-packlets/recommended'],
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        '@rushstack/packlets/mechanics': ['error'],
        '@rushstack/packlets/circular-deps': ['error'],
      },
    },
  ],
};
