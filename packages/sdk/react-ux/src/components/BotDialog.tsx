//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect } from 'react';

import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import LinearProgress from '@material-ui/core/LinearProgress';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { makeStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import MemoryIcon from '@material-ui/icons/Memory';
import Alert from '@material-ui/lab/Alert';

import { useRegistryBots, useRegistryBotFactories } from '@dxos/react-client';

import { useKeywords } from '../hooks';
import DialogHeading from './DialogHeading';

// TODO(egorgripasov): Factor out to config/client.
const BOT_FACTORY_DOMAIN = 'dxos.network';

const useStyles = makeStyles((theme) => ({
  paper: {
    // TODO(burdon): Standardize.
    minWidth: 500
  },
  formControl: {
    width: '100%',
    marginBottom: theme.spacing(2)
  },
  advanced: {
    border: 0,
    boxShadow: 'none',
    '&:before': {
      display: 'none'
    }
  },
  advancedHeader: {
    padding: 0
  },
  advancedBody: {
    display: 'block',
    paddingLeft: 0,
    paddingRight: 0
  },
  title: {
    marginLeft: theme.spacing(2)
  }
}));

/**
 * Dialog to create and invite bot to party.
 */
const BotDialog = ({
  open,
  invitationPending,
  onSubmit,
  onClose,
  onBotFactorySelect,
  invitationError
}: {
  open: boolean;
  onSubmit: ({ topic, bot, spec }: { topic?: string; bot: string | undefined; spec?: Record<string, unknown> }) => void;
  onClose: () => void;
  invitationPending: any;
  onBotFactorySelect: (topic: string, force?: boolean) => void;
  invitationError: string | undefined;
}) => {
  const classes = useStyles();
  const [pending, setPending] = useState(false);
  const [bot, setBot] = useState<string>('');
  const [botFactoryTopic, setBotFactoryTopic] = useState('');
  const [botVersions, setBotVersions] = useState<string[]>([]);
  const [botVersion, setBotVersion] = useState<string>();
  const [error, setError] = useState<string>();
  const [botFactoryError, setBotFactoryError] = useState();
  const [advanced, setAdvanced] = useState(false);

  const keywords = useKeywords();

  // TODO(burdon): Could have same topic?
  const registryBotFactories = useRegistryBotFactories();
  const registryBots = useRegistryBots({ sortByKeywords: keywords });

  const handleSubmit = async () => {
    setError(undefined);
    setPending(true);
    if (botFactoryError) {
      await handleBotFactorySelect(botFactoryTopic, true);
    }
    await onSubmit({ bot: botVersion });
  };

  const handleBotFactorySelect = async (botFactoryTopic: string, force?: boolean) => {
    if (botFactoryTopic && onBotFactorySelect) {
      setBotFactoryError(undefined);
      try {
        await onBotFactorySelect(botFactoryTopic, force);
      } catch (err) {
        console.error(err);
        setBotFactoryError(err);
        setPending(false);
      }
    }
  };

  useEffect(() => {
    const versions = registryBots
      .filter(({ names }) => !!names.find((name) => name.startsWith(`${bot}@`)))
      .map(({ names }) => names)
      .flat()
      .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }))
      .reverse()
      .filter((name: string) => name !== bot);

    versions.unshift(bot);
    setBotVersions(versions);
    setBotVersion(bot || '');
  }, [bot]);

  useEffect(() => {
    if (Array.isArray(registryBotFactories)) {
      const botFactory =
        registryBotFactories.find(({ name }) => name === window.location.hostname) ||
        registryBotFactories.find(({ name }) => name?.endsWith(BOT_FACTORY_DOMAIN));
      if (botFactory) {
        setBotFactoryTopic(botFactory.topic);
        setAdvanced(false);
      } else {
        setAdvanced(true);
      }
    }
  }, [registryBotFactories]);

  useEffect(() => {
    if (open && botFactoryTopic && onBotFactorySelect) {
      handleBotFactorySelect(botFactoryTopic);
    }
  }, [botFactoryTopic, open]);

  useEffect(() => {
    if (typeof invitationPending === 'boolean') {
      setPending(invitationPending);
    }
  }, [invitationPending]);

  useEffect(() => {
    setError(invitationError);
  }, [invitationError]);

  const handleClose = () => {
    setError(undefined);
    setBotFactoryError(undefined);
    setPending(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : handleClose} // No click away when in progress
      classes={{ paper: classes.paper }}
    >
      <DialogHeading title='Invite bot' icon={MemoryIcon} />

      <DialogContent>
        <FormControl className={classes.formControl}>
          <InputLabel id='botNameLabel'>Bot</InputLabel>
          <Select
            labelId='botNameLabel'
            id='botName'
            value={bot}
            fullWidth
            disabled={pending}
            onChange={(event) => setBot((event.target as HTMLSelectElement).value)}
          >
            {registryBots
              .filter((bots) => bots.names && bots.names.length)
              .map(({ names = [] }) =>
                names.sort((a, b) => a.length - b.length).filter((name) => name.indexOf('@') === -1)
              )
              .filter((names) => names.length)
              .map((names) => (
                <MenuItem key={names[0]} value={names[0]}>
                  {names[0]}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <Accordion className={classes.advanced} expanded={advanced} onChange={() => setAdvanced(!advanced)}>
          <AccordionSummary className={classes.advancedHeader} expandIcon={<ArrowDropDownIcon />}>
            <InputLabel shrink>Advanced</InputLabel>
          </AccordionSummary>
          <AccordionDetails className={classes.advancedBody}>
            <FormControl className={classes.formControl}>
              <InputLabel id='botVersionLabel'>Version</InputLabel>
              <Select
                labelId='botVersionLabel'
                id='botVersion'
                value={botVersion}
                disabled={botVersions.length === 0 || pending}
                fullWidth
                onChange={(event) => setBotVersion((event.target as HTMLSelectElement).value)}
              >
                {botVersions.map((version) => (
                  <MenuItem key={version} value={version}>
                    {version}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl className={classes.formControl}>
              <InputLabel id='botFactoryLabel'>Bot Factory</InputLabel>
              <Select
                labelId='botFactoryLabel'
                id='botFactory'
                value={botFactoryTopic}
                fullWidth
                disabled={pending}
                onChange={(event) => setBotFactoryTopic((event.target as HTMLSelectElement).value)}
              >
                {registryBotFactories
                  .filter((factories) => factories.names && factories.names.length)
                  .map(({ topic, names }) => (
                    <MenuItem key={topic} value={topic}>
                      {names[0]}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </AccordionDetails>
        </Accordion>
        {pending && <LinearProgress />}
        {error && <Alert severity='error'>Deploying failed.</Alert>}
        {botFactoryError && <Alert severity='error'>Unable to connect to BotFactory.</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          disabled={pending || !botFactoryTopic || !botVersion}
          variant='contained'
          color='primary'
          onClick={handleSubmit}
        >
          Invite
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BotDialog;
