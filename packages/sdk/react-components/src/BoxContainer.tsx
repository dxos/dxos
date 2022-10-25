//
// Copyright 2022 DXOS.org
//

import { Box, BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface StyledBoxProps extends BoxProps {
  expand?: boolean;
  column?: boolean;
  scrollX?: boolean;
  scrollY?: boolean;
}

/**
 * Expandable container that support scrolling.
 * https://css-tricks.com/snippets/css/a-guide-to-flexbox
 * NOTE: Scrolling flexboxes requires that ancestors set overflow to hidden, which is set by default.
 *
 * Example:
 * ```
 * <FullScreen>
 *   <BoxContainer>
 *     <div>Fixed</div>
 *      <BoxContainer scrollX>
 *        <List />
 *      </BoxContainer>
 *   <BoxContainer>
 * </Fullscreen>
 * ```
 */
export const BoxContainer: any = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'expand' &&
    prop !== 'column' &&
    prop !== 'scrollX' &&
    prop !== 'scrollY'
})<StyledBoxProps>(({ expand, column, scrollX, scrollY }) => ({
  display: 'flex',
  flexDirection: column ? 'column' : undefined,
  flex: expand ? 1 : undefined,
  overflowX: scrollX ? 'scroll' : 'hidden',
  overflowY: scrollY ? 'scroll' : 'hidden'
}));
