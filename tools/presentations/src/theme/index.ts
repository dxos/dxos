//
// Copyright 2022 DXOS.org
//

export default {
  googleFont:
    'https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Roboto:ital,wght@0,300;0,400;0,500;1,400&display=swap',

  /* Style Definitions */
  fonts: {
    body: 'Roboto, sans-serif',
    mono: '"Roboto Mono", monospace'
  },

  fontSizes: {
    xxsmall: '1.2rem',
    xsmall: '1.5rem', // 24px
    small: '1.8rem', // 28.8px
    base: '2.25rem', // 36px
    large: '3rem', // 48px
    xlarge: '4.5rem', // 72px
    xxlarge: '6rem', // 96px
    xxxlarge: '10rem' // 160px
  },

  fontWeights: {
    default: '400',
    light: '300',
    strong: '500'
  },

  lineHeights: {
    default: '150%',
    mono: '160%',
    title: '140%',
    small: '100%'
  },

  space: [0, 10, 25, 50, 75, 100, 150, 250],

  colors: {
    MDXPYellow: '#FFAC00',
    MDXPOrange: '#F26419',
    MDXPCharcoal: '#2F4858',
    MDXPBlue: '#33658A',
    MDXPLightBlue: '#86BBD8',

    MDXPGray0: '#2E2E2E',
    MDXPGray1: '#333333',
    MDXPGray2: '#4F4F4F',
    MDXPGray3: '#828282',
    MDXPGray4: '#BDBDBD',
    MDXPGray5: '#E0E0E0',
    MDXPGray6: '#F2F2F2',

    // Necessary Theme-UI definitions (It's probably better to use predefined color variables)
    text: '#333333',
    background: '#F2F2F2',
    primary: '#FFAC00',
    secondary: '#F26419',
    accent: '#33658A',
    highlight: '#FFAC00',
    muted: '#828282'
  },

  breakpoints: ['0px', '1150px', '1500px'],

  /* Style Variants */
  text: {
    main: {
      fontFamily: 'body',
      lineHeight: 'default',
      fontSize: ['base', 'xsmall', 'small', 'base']
    },

    mono: {
      fontFamily: 'mono',
      lineHeight: 'mono',
      fontSize: ['xsmall', 'xxsmall', 'xxsmall', 'xsmall']
    },

    title: {
      fontFamily: 'body',
      lineHeight: 'title',
      textTransform: 'uppercase',
      fontWeight: 'default',
      fontSize: ['xxlarge', 'xlarge', 'xxlarge']
    },

    subtitle: {
      fontFamily: 'body',
      lineHeight: 'title',
      fontWeight: 'light',
      textTransform: 'lowercase',
      fontVariant: 'small-caps',
      fontSize: ['xlarge', 'large', 'xlarge']
    }
  },

  // prettier-ignore
  gradient: {
    light: {
      background: (t: any) =>
        `radial-gradient(100% 100% at 50% 0%, ${t.colors.MDXPGray6} 0%, ${t.colors.MDXPGray4} 100%)`
    },
    dark: {
      background: (t: any) =>
        `radial-gradient(100% 100% at 50% 0%, ${t.colors.MDXPGray2} 0%, ${t.colors.MDXPGray1} 100%)`
    },
    yellow: {
      background: (t: any) =>
        `linear-gradient(270deg, ${t.colors.MDXPYellow} 0%, ${t.colors.MDXPOrange} 250%)`
    }
  },

  /* Style Applications */
  styles: {
    root: {
      bg: 'black'
    },

    pre: {
      variant: 'text.mono',
      overFlow: 'auto'
    },

    p: {
      my: [1, 2, 3]
    },

    h1: {
      variant: 'text.title'
    },

    h2: {
      variant: 'text.subtitle'
    },

    strong: {
      fontWeight: 'default',
      color: 'MDXPGray0',
      fontSize: '1.2em'
    }
  },

  mdxp: {
    slide: {
      variant: 'text.main'
    }
  }
};
