import * as React from 'react';

import BrowserOnly from '@docusaurus/BrowserOnly';

import { Box, Tooltip, ToggleButtonGroup, ToggleButton, Collapse } from '@mui/material';
import { MUIStyledCommonProps } from '@mui/system';
import { IconButton } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';

import { styled, alpha, useTheme } from '@mui/material/styles';

import { JavaScriptIcon, TypeScriptIcon } from './icons';
import { HighlightedCode } from './HighlightedCode';

const Root = styled('div')(({ theme }) => ({
  marginBottom: 40,
  marginLeft: theme.spacing(-2),
  marginRight: theme.spacing(-2),
  [theme.breakpoints.up('sm')]: {
    marginLeft: 0,
    marginRight: 0,
  },
}));

interface DemoRootProps extends MUIStyledCommonProps {
  hiddenToolbar: any,
  bg: any
}

const DemoRoot = styled('div', {
  shouldForwardProp: (prop) => prop !== 'hiddenToolbar' && prop !== 'bg',
})<DemoRootProps>(({ theme, hiddenToolbar, bg }) => ({
  position: 'relative',
  outline: 0,
  margin: 'auto',
  display: 'flex',
  justifyContent: 'center',
  [theme.breakpoints.up('sm')]: {
    borderRadius: 10,
    ...(bg === 'outlined' && {
      borderLeftWidth: 1,
      borderRightWidth: 1,
    }),
    /* Make no difference between the demo and the markdown. */
    ...(bg === 'inline' && {
      padding: theme.spacing(3),
    }),
    ...(hiddenToolbar && {
      paddingTop: theme.spacing(3),
    }),
  },
  /* Isolate the demo with an outline. */
  ...(bg === 'outlined' && {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.action.active, 0.12)}`,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  }),
  /* Prepare the background to display an inner elevation. */
  ...(bg === true && {
    padding: theme.spacing(3),
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
  }),
  ...(hiddenToolbar && {
    paddingTop: theme.spacing(2),
  }),
}));

const Code = styled(HighlightedCode)(({ theme }) => ({
  padding: 0,
  marginBottom: theme.spacing(1),
  marginTop: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    marginTop: theme.spacing(0),
  },
  '& pre': {
    margin: '0 auto',
    maxHeight: 'min(68vh, 1000px)',
  },
}));

const StyledToggleButtons = styled(ToggleButtonGroup)(({ theme }) => ({
  '& .MuiToggleButton-root': {
    borderColor: `${alpha(theme.palette.action.active, 0.12)}`
  }
}));

const DemoToolbar = ({
  codeMode,
  githubUrl,
  collapseOpen,
  onCodeModeSelect,
  onCollapse,
  showTSButton,
  showJSButton,
  showCollapseButton,
  showExampleButton
}) => {
  const theme = useTheme();
  const toggleButtonStyles = {
    padding: '5px 10px',
    color: () => theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black,
    borderRadius: 0.5,
    borderColor: () => theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black,
    '&.Mui-selected, &.Mui-selected:hover': {
      color: () => theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black,
      backgroundColor: () => theme.palette.mode === 'dark' ? theme.palette.grey[500] : theme.palette.grey[200]
    }
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between' }}>
      <Box sx={{flex: 1}}>
        {collapseOpen && <StyledToggleButtons
          sx={{ 
            margin: '8px 0'
          }}
          exclusive
          value={codeMode}
          onChange={onCodeModeSelect}
        >
          {showJSButton && <ToggleButton
            sx={toggleButtonStyles}
            value={'JS'}
          >
            <JavaScriptIcon sx={{ fontSize: 20 }} />
          </ToggleButton>}
          {showTSButton && <ToggleButton
            sx={toggleButtonStyles}
            value={'TS'}
          >
            <TypeScriptIcon sx={{ fontSize: 20 }} />
          </ToggleButton>}
        </StyledToggleButtons>}
      </Box>
      <Box>
        {showCollapseButton && (
          <Tooltip title="Show the full source">
            <IconButton
              sx={{
                marginTop: 1,
                marginBottom: 1
              }}
              onClick={() => {
                onCollapse();
              }}
            >
              <CodeRoundedIcon />
            </IconButton>
          </Tooltip>
        )}
        {showExampleButton && githubUrl && (
          <Tooltip title="Go to Github">
            <IconButton
              sx={{
                marginTop: 1,
                marginBottom: 1,
                marginRight: 0.5
              }}
              href={githubUrl}
              target={'_blank'}
            >
              <GitHubIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

export enum CodeMode {
  JS = 'JS',
  TS = 'TS'
};

export const Demo = ({ component, rawContent, collapsible, githubUrl, collapsibleDefaultOpened }) => {
  const [codeMode, setCodeMode] = React.useState<CodeMode>(CodeMode.JS);
  const [open, setOpen] = React.useState(collapsible && collapsibleDefaultOpened);
  React.useEffect(() => {
    if (!rawContent.js && rawContent.ts) {
      setCodeMode(CodeMode.TS);
    }
  }, []);
  
  return (
    <Root>
      <DemoRoot
        hiddenToolbar={true}
        bg={'outlined'}
        id={'demo-id'}
      >
        <BrowserOnly fallback={<div>Loading...</div>}>
          {() => {
            const DemoComponent = component().Main;
            return <DemoComponent />;
          }}
        </BrowserOnly>
      </DemoRoot>
      <DemoToolbar
        codeMode={codeMode}
        githubUrl={githubUrl}
        showCollapseButton={collapsible}
        showExampleButton={!!githubUrl}
        showJSButton={!!rawContent.js}
        showTSButton={!!rawContent.ts}
        collapseOpen={open}
        onCodeModeSelect={(_, mode) => {
          if (mode && mode !== codeMode) {
              setCodeMode(mode);
            }
          }
        }
        onCollapse={() => {
          setOpen(!open);
        }}
      />
      <Collapse in={open}>
        {codeMode === CodeMode.JS && !!rawContent.js && <Code
          code={rawContent.js}
          language={'jsx'}
        />}
        {codeMode === CodeMode.TS && !!rawContent.ts && <Code
          code={rawContent.ts}
          language={'tsx'}
        />}
      </Collapse>
    </Root>
  );
}
