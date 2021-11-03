//
// Copyright 2020 DXOS.org
//

import {
  AddCircleOutline as CreateIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import {
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  TextField,
  Typography
} from '@mui/material';

import assert from 'assert';
import MobileDetect from 'mobile-detect';
import React, { useRef, useState } from 'react';

import { generateSeedPhrase } from '@dxos/crypto';

// TODO(burdon): Enum.
enum Stage {
  PENDING,
  START,
  RESTORE,
  ENTER_USERNAME,
  SHOW_SEED_PHRASE,
  CHECK_SEED_PHRASE,
  IMPORT_KEYRING
}

// TODO(burdon): Factor out (helpers).
const ordinal = (n: number) => String(n) + ((n === 1) ? 'st' : (n === 2) ? 'nd' : (n === 3) ? 'rd' : 'th');

// TODO(burdon): Factor out (helpers, context?)
const mobile = new MobileDetect(window.navigator.userAgent).mobile();

/*
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
}), { defaultTheme });
*/

export interface RegistrationDialogProps {
  open: boolean
  debug: boolean
  onFinishCreate: (username: string, seedPhrase: string) => void // TODO(burdon): Rename.
  onFinishRestore: (seedPhrase: string) => void // TODO(burdon): Rename.
  keyringDecrypter: (text: string | ArrayBuffer | null, passphrase: number) => string
}

/**
 * Registration and recovery dialog.
 */
// TODO(burdon): Splitup.
// TODO(burdon): Replace component in demos.
export const RegistrationDialog = ({
  open = true,
  debug = false,
  onFinishCreate,
  onFinishRestore,
  keyringDecrypter
}: RegistrationDialogProps) => {
  const classes = {}; // TODO(burdon): Replace with SX.
  const [stage, setStage] = useState(Stage.START);
  const [seedPhrase] = useState(generateSeedPhrase());
  const [username, setUsername] = useState('');
  const [recoveredSeedPhrase, setRecoveredSeedPhrase] = useState('');
  const usernameRef = useRef();
  const seedPhraseRef = useRef();

  const words = seedPhrase.split(' ');
  const selected = [Math.floor(Math.random() * words.length), Math.floor(Math.random() * words.length)];
  while (selected[0] === selected[1]) {
    selected[1] = Math.floor(Math.random() * words.length);
  }
  selected.sort((a, b) => (a < b ? -1 : a === b ? 0 : 1));

  const handleDownloadSeedPhrase = (seedPhrase: string) => {
    const file = new Blob([seedPhrase], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = 'dxos-recovery-seedphrase.txt'; // TODO(burdon): Const.
    element.click();
  };

  const restoreSeedPhraseValid = () => {
    return recoveredSeedPhrase.trim().toLowerCase().split(/\s+/g).length === 12;
  }

  const handleNext = async (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> => {
    switch (stage) {
      case Stage.ENTER_USERNAME: {
        assert(usernameRef.current);
        const inputElement = (usernameRef.current as unknown as HTMLInputElement);
        if (inputElement.value.trim().length > 0) {
          setUsername(inputElement.value.trim());
          setStage(Stage.SHOW_SEED_PHRASE);
        }
        break;
      }

      case Stage.SHOW_SEED_PHRASE: {
        setStage(Stage.CHECK_SEED_PHRASE);
        break;
      }

      case Stage.CHECK_SEED_PHRASE: {
        const testWords = (seedPhraseRef.current as unknown as HTMLInputElement).value.trim().toLowerCase().split(/\s+/);

        const match = (testWords.length === 2 &&
          testWords[0] === words[selected[0]] && testWords[1] === words[selected[1]]);

        // TODO(burdon): Decide policy.
        const skipMatch = (debug || ev.shiftKey || !!mobile);
        if (match || skipMatch) {
          setStage(Stage.PENDING);
          await onFinishCreate(username, seedPhrase);
        } else {
          setStage(Stage.SHOW_SEED_PHRASE);
        }
        break;
      }

      case Stage.RESTORE: {
        const restoreSeedPhrase = recoveredSeedPhrase.trim().toLowerCase();

        // Sanity check that it looks like a seed phrase.
        if (!restoreSeedPhraseValid()) {
          throw new Error('Invalid seed phrase.');
        } else {
          // TODO(dboreham): Do more checks on input (not all strings containing 12 words are valid seed phrases).
          setStage(Stage.PENDING);
          await onFinishRestore(restoreSeedPhrase);
        }
        break;
      }

      default:
        setStage(Stage.ENTER_USERNAME);
    }
  };

  const handleKeyDown = async (event: React.SyntheticEvent) => {
    if ((event as React.KeyboardEvent).key === 'Enter') { // TODO(burdon): Use util.
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
              data-testid='chip'
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // TODO(burdon): Configure title.
  const getStage = (stage: number) => {
    switch (stage) {
      case Stage.START: {
        return (
          <>
            <DialogTitle>User Profile</DialogTitle>
            <DialogContent className={classes.container}>
              <div>
                <Paper className={classes.choice} variant='outlined'>
                  <CreateIcon className={classes.icon} />
                  <Typography className={classes.caption}>
                    Create a new profile<br />and wallet.
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => setStage(Stage.ENTER_USERNAME)}>
                    Create Wallet
                  </Button>
                </Paper>
              </div>
              <div>
                <Paper className={classes.choice} variant='outlined'>
                  <RestoreIcon className={classes.icon} />
                  <Typography className={classes.caption}>
                    Enter your seed phrase<br />to recover your profile.
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => setStage(Stage.RESTORE)}>
                    Recover Wallet
                  </Button>
                </Paper>
              </div>
            </DialogContent>
            {/* ISSUE: https://github.com/dxos/echo/issues/339#issuecomment-735918728 */}
            {/*
            <DialogActions>
              <Button variant='text' color='secondary' onClick={() => setStage(Stage.IMPORT_KEYRING)}>Import Keyring</Button>
            </DialogActions>
            */}
          </>
        );
      }

      case Stage.RESTORE: {
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
                onKeyDown={handleKeyDown}
              />
            </DialogContent>
            <DialogActions>
              <Button color='primary' onClick={() => setStage(Stage.START)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext} disabled={!restoreSeedPhraseValid()}>Restore</Button>
            </DialogActions>
          </>
        );
      }

      case Stage.ENTER_USERNAME: {
        return (
          <>
            <DialogTitle>Create your Identity</DialogTitle>
            <DialogContent>
              <DialogContentText>Enter a username.</DialogContentText>
              <TextField autoFocus fullWidth spellCheck={false} inputRef={usernameRef} onKeyDown={handleKeyDown} />
            </DialogContent>
            <DialogActions>
              <Button color='primary' onClick={() => setStage(Stage.START)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Next</Button>
            </DialogActions>
          </>
        );
      }

      case Stage.SHOW_SEED_PHRASE: {
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
                <Button color='primary' onClick={() => setStage(Stage.ENTER_USERNAME)}>Back</Button>
                <Button variant='contained' color='primary' onClick={handleNext}>Next</Button>
              </div>
            </DialogActions>
          </>
        );
      }

      case Stage.CHECK_SEED_PHRASE: {
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
              <Button color='primary' onClick={() => setStage(Stage.ENTER_USERNAME)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Finish</Button>
            </DialogActions>
          </>
        );
      }

      case Stage.PENDING: {
        return (
          <>
            <DialogTitle>Initializing...</DialogTitle>
            <DialogContent>
              <LinearProgress />
            </DialogContent>
          </>
        );
      }

      case Stage.IMPORT_KEYRING: {
        return null;
        /*
        return (
          // open attribute deleted as it is not present in ImportKeyringDialog
          <ImportKeyringDialog onClose={() => setStage(Stage.START)} decrypter={keyringDecrypter} />
        );
        */
      }

      default: {
        return null;
      }
    }
  };

  // TODO(burdon): Convert to react-components CustomDialog.
  return (
    <Dialog open={open} maxWidth='sm' fullWidth classes={{ paper: classes.paper }}>
      {getStage(stage)}
    </Dialog>
  );
};
