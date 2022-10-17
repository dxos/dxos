import React, {useEffect} from 'react';
import { useDarkMode } from 'storybook-dark-mode';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

const ThemeWrapper = ({ children }) => {
  // render your custom theme provider
  const darkMode = useDarkMode();
  console.log('[darkMode]', darkMode);
  useEffect(()=>{document.documentElement.classList[darkMode ? 'add' : 'remove']('dark')}, [darkMode])
  return children;
};

export const decorators = [
  (Story) => (
    <ThemeWrapper>
      <Story />
    </ThemeWrapper>
  )
];
