import React from 'react';
import { Theme, ThemeProvider, withStyles } from '@material-ui/core';

const withThemeProvider = <P extends object>(Component: React.ComponentType<P>): React.FC<P & { theme: Theme }> => {
  return ({ theme, ...props }: { theme: Theme }) => (
    <ThemeProvider theme={theme}>
      <Component {...(props as P)} />
    </ThemeProvider>
  );
};

export default withThemeProvider;
