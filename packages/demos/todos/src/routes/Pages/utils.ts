import type { Theme } from '@mui/material';

function getPageHeight(theme: Theme) {
  const topSpacing = Number(theme.mixins.toolbar.minHeight) + parseInt(theme.spacing(1));
  const padding = theme.mixins.contentContainer.padding;

  return `calc(100vh - ${topSpacing}px - ${padding}em)`;
}

export { getPageHeight };
