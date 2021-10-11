//
// Copyright 2020 DXOS.org
//

import CreateIcon from '@mui/icons-material/AddCircleOutline';
import RestoreIcon from '@mui/icons-material/Restore';
import { createTheme, Theme } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import MuiDialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { makeStyles, withStyles } from '@mui/styles';
import assert from 'assert';
import MobileDetect from 'mobile-detect';
import React, { useRef, useState } from 'react';

import { generateSeedPhrase } from '@dxos/crypto';

import ImportKeyringDialog from './ImportKeyringDialog';

const STAGE_PENDING = -1;
const STAGE_START = 0;
const STAGE_RESTORE = 1;
const STAGE_ENTER_USERNAME = 2;
const STAGE_SHOW_SEED_PHRASE = 3;
const STAGE_CHECK_SEED_PHRASE = 4;
const STAGE_IMPORT_KEYRING = 5;

// TODO(burdon): Factor out.
const ordinal = (n: number) => String(n) + ((n === 1) ? 'st' : (n === 2) ? 'nd' : (n === 3) ? 'rd' : 'th');

// TODO(burdon): Factor out.
const mobile = new MobileDetect(window.navigator.userAgent).mobile();

const useStyles = makeStyles((theme: Theme) => ({
  paper: {
    minWidth: 700,
    minHeight: 300
  },

  container: {
    display: 'flex',
    flex: 1,
    justifyContent: 'space-between'
  },

  choice: {
    width: 300,
    height: 240,
    margin: theme.spacing(1),
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },

  icon: {
    margin: theme.spacing(2),
    fontSize: 'xx-large'
  },

  caption: {
    textAlign: 'center',
    marginBottom: theme.spacing(4)
  },

  seedPhraseActions: {
    justifyContent: 'space-between'
  },

  seedPhrase: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3)
  },
  seedChip: {
    width: 128,
    justifyContent: 'inherit',
    margin: theme.spacing(0.5)
  },
  seedLabel: {
    paddingLeft: theme.spacing(1)
  },
  seedNumber: {
    margin: 0,
    fontSize: 11,
    height: 24,
    width: 24,
    marginLeft: 5,
    backgroundColor: theme.palette.primary.dark,
    color: 'white'
  }
}), { defaultTheme: createTheme({}) });

const DialogActions = withStyles(theme => ({
  root: {
    padding: theme.spacing(2)
  }
}))(MuiDialogActions);

/**
 * Registration and recovery dialog.
 */
const RegistrationDialog = ({
  open = true,
  debug = false,
  onFinishCreate,
  onFinishRestore,
  keyringDecrypter
}: {
  open?: boolean,
  debug?: boolean,
  onFinishCreate: (username: string, seedPhrase: string) => void,
  onFinishRestore: (seedPhrase: string) => void,
  keyringDecrypter: (text: string | ArrayBuffer | null, passphrase: number) => string
}) => {
  const classes = useStyles();
  const [stage, setStage] = useState(STAGE_START);
  const [seedPhrase] = useState(generateSeedPhrase());
  const [username, setUsername] = useState('');
  const [recoveredSeedPhrase, setRecoveredSeedPhrase] = useState('');

  const words = seedPhrase.split(' ');
  const selected = [Math.floor(Math.random() * words.length), Math.floor(Math.random() * words.length)];
  while (selected[0] === selected[1]) {
    selected[1] = Math.floor(Math.random() * words.length);
  }
  selected.sort((a, b) => (a < b ? -1 : a === b ? 0 : 1));

  const usernameRef = useRef();
  const seedPhraseRef = useRef();

  const handleDownloadSeedPhrase = (seedPhrase: string) => {
    const file = new Blob([seedPhrase], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = 'dxos-recovery-seedphrase.txt';
    element.click();
  };

  const restoreSeedPhraseValid = () => recoveredSeedPhrase.trim().toLowerCase().split(/\s+/g).length === 12;

  const handleNext = async (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> => {
    switch (stage) {
      case STAGE_ENTER_USERNAME: {
        assert(usernameRef.current);
        const inputElement = (usernameRef.current as unknown as HTMLInputElement);
        if (inputElement.value.trim().length > 0) {
          setUsername(inputElement.value.trim());
          setStage(STAGE_SHOW_SEED_PHRASE);
        }
        break;
      }

      case STAGE_SHOW_SEED_PHRASE: {
        setStage(STAGE_CHECK_SEED_PHRASE);
        break;
      }

      case STAGE_CHECK_SEED_PHRASE: {
        const testWords = (seedPhraseRef.current as unknown as HTMLInputElement).value.trim().toLowerCase().split(/\s+/);

        const match = (testWords.length === 2 &&
          testWords[0] === words[selected[0]] && testWords[1] === words[selected[1]]);

        const skipMatch = (debug || ev.shiftKey || !!mobile);

        // TODO(burdon): Decide policy.
        if (match || skipMatch) {
          setStage(STAGE_PENDING);
          await onFinishCreate(username, seedPhrase);
        } else {
          setStage(STAGE_SHOW_SEED_PHRASE);
        }
        break;
      }

      case STAGE_RESTORE: {
        const restoreSeedPhrase = recoveredSeedPhrase.trim().toLowerCase();

        // Sanity check that it looks like a seed phrase.
        if (!restoreSeedPhraseValid()) {
          throw new Error('Invalid seed phrase.');
        } else {
          // TODO(dboreham): Do more checks on input (not all strings containing 12 words are valid seed phrases).
          setStage(STAGE_PENDING);
          await onFinishRestore(restoreSeedPhrase);
        }
        break;
      }

      default:
        setStage(STAGE_ENTER_USERNAME);
    }
  };

  const handleKeyDown = async (event: React.SyntheticEvent) => {
    if ((event as React.KeyboardEvent).key === 'Enter') {
      await handleNext(event as React.MouseEvent<HTMLButtonElement, MouseEvent>);
    }
  };

  const SeedPhrasePanel = ({ value }: { value: string }) => {
    const words = value.split(' ');

    return (
      <Grid container className={classes.seedPhrase} spacing={0}>
        {words.map((word, i) => (
          <Grid item key={i} xs={3}>
            <Chip
              key={i}
              icon={<Avatar className={classes.seedNumber}>{i + 1}</Avatar>}
              classes={{ root: classes.seedChip, label: classes.seedLabel }}
              label={word}
              data-testid="chip"
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // TODO(burdon): Configure title.
  const getStage = (stage: number) => {
    // eslint-disable-next-line default-case
    switch (stage) {
      case STAGE_START: {
        return (
          <>
            <DialogTitle>User Profile</DialogTitle>
            <DialogContent className={classes.container}>
              <div>
                <Paper className={classes.choice} variant="outlined">
                  <CreateIcon className={classes.icon} />
                  <Typography className={classes.caption}>
                    Create a new profile<br />and wallet.
                  </Typography>
                  <Button variant="contained" color="primary" onClick={() => setStage(STAGE_ENTER_USERNAME)}>
                    Create Wallet
                  </Button>
                </Paper>
              </div>
              <div>
                <Paper className={classes.choice} variant="outlined">
                  <RestoreIcon className={classes.icon} />
                  <Typography className={classes.caption}>
                    Enter your seed phrase<br />to recover your profile.
                  </Typography>
                  <Button variant="contained" color="primary" onClick={() => setStage(STAGE_RESTORE)}>
                    Recover Wallet
                  </Button>
                </Paper>
              </div>
            </DialogContent>
            {/* ISSUE: https://github.com/dxos/echo/issues/339#issuecomment-735918728 */}
            {/* <DialogActions>
              <Button variant='text' color='secondary' onClick={() => setStage(STAGE_IMPORT_KEYRING)}>Import Keyring</Button>
            </DialogActions> */}
          </>
        );
      }

      case STAGE_RESTORE: {
        return (
          <>
            <DialogTitle>Restoring your Wallet</DialogTitle>
            <DialogContent>
              <DialogContentText>Enter the seed phrase.</DialogContentText>
              <TextField
                autoFocus
                fullWidth
                spellCheck={false}
                value={recoveredSeedPhrase}
                onChange={e => setRecoveredSeedPhrase(e.target.value)}
                onKeyDown={handleKeyDown}/>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={() => setStage(STAGE_START)}>Back</Button>
              <Button variant="contained" color="primary" onClick={handleNext} disabled={!restoreSeedPhraseValid()}>Restore</Button>
            </DialogActions>
          </>
        );
      }

      case STAGE_ENTER_USERNAME: {
        return (
          <>
            <DialogTitle>Create your Identity</DialogTitle>
            <DialogContent>
              <DialogContentText>Enter a username.</DialogContentText>
              <TextField autoFocus fullWidth spellCheck={false} inputRef={usernameRef} onKeyDown={handleKeyDown} />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={() => setStage(STAGE_START)}>Back</Button>
              <Button variant="contained" color="primary" onClick={handleNext}>Next</Button>
            </DialogActions>
          </>
        );
      }

      case STAGE_SHOW_SEED_PHRASE: {
        return (
          <>
            <DialogTitle>Seed Phrase</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Your recovery seed phrase consists of the twelve words below.
                <br />
                You will need to enter the seed phrase if you ever need to recover your wallet.
              </DialogContentText>
              <SeedPhrasePanel value={seedPhrase} />
              <DialogContentText>
                <b>NEVER</b> share your recovery seed phrase with anyone.
              </DialogContentText>
            </DialogContent>
            <DialogActions className={classes.seedPhraseActions}>
              <div>
                <Button onClick={() => handleDownloadSeedPhrase(seedPhrase)}>Download</Button>
              </div>
              <div>
                <Button color="primary" onClick={() => setStage(STAGE_ENTER_USERNAME)}>Back</Button>
                <Button variant="contained" color="primary" onClick={handleNext}>Next</Button>
              </div>
            </DialogActions>
          </>
        );
      }

      case STAGE_CHECK_SEED_PHRASE: {
        return (
          <>
            <DialogTitle>Verify The Seed Phrase</DialogTitle>
            <DialogContent>
              <DialogContentText>
                You will need to enter the seed phrase if you ever need to recover your wallet.
              </DialogContentText>
              <DialogContentText>
                {`Enter the ${ordinal(selected[0] + 1)} and ${ordinal(selected[1] + 1)} words.`}
              </DialogContentText>
              <TextField autoFocus fullWidth spellCheck={false} inputRef={seedPhraseRef} onKeyDown={handleKeyDown} />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={() => setStage(STAGE_ENTER_USERNAME)}>Back</Button>
              <Button variant="contained" color="primary" onClick={handleNext}>Finish</Button>
            </DialogActions>
          </>
        );
      }

      case STAGE_PENDING: {
        return (
          <>
            <DialogTitle>Initializing...</DialogTitle>
            <DialogContent>
              <LinearProgress />
            </DialogContent>
          </>
        );
      }

      case STAGE_IMPORT_KEYRING: {
        return (
          // open attribute deleted as it is not present in ImportKeyringDialog
          <ImportKeyringDialog onClose={() => setStage(STAGE_START)} decrypter={keyringDecrypter} />
        );
      }
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" classes={{ paper: classes.paper }}>
      {getStage(stage)}
    </Dialog>
  );
};

export default RegistrationDialog;
