//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import React, { useState, useEffect } from 'react';

import {
  makeStyles,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableContainer,
  TableRow,
  Toolbar,
  Typography
} from '@material-ui/core';
import {
  Add as InviteIcon,
  Clear as DeleteIcon,
  FileCopy as FileCopyIcon,
  People as PeopleIcon
} from '@material-ui/icons';
import { Alert } from '@material-ui/lab';

import { BotFactoryClient } from '@dxos/botkit-client';
import { keyToBuffer, verify, SIGNATURE_LENGTH } from '@dxos/crypto';
import { Contact, Party, PartyMember } from '@dxos/echo-db';
import { useClient, useContacts } from '@dxos/react-client';

import { useMembers } from '../hooks';
import BotDialog from './BotDialog';
import MemberAvatar from './MemberAvatar';
import PendingInvitation from './PendingInvitation';
import PendingOfflineInvitation from './PendingOfflineInvitation';
import TableCell from './TableCell';

const useStyles = makeStyles((theme) => ({
  title: {
    marginLeft: theme.spacing(2)
  },
  table: {
    minWidth: 650,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  tableContainer: {
    maxHeight: 250,
    paddingRight: 20
  },
  expand: {
    display: 'flex',
    flex: 1
  },
  label: {
    fontVariant: 'all-small-caps'
  },
  passcode: {
    marginLeft: theme.spacing(1),
    padding: theme.spacing(1),
    border: `2px solid ${theme.palette.primary.dark}`
  },
  colAvatar: {
    width: 60
  },
  colPasscode: {
    width: 160
  },
  colStatus: {
    width: 150
  },
  colActions: {
    width: 60,
    textAlign: 'right'
  }
}));

const PartySharingDialog = ({ party, open, onClose }: { party: Party; open: boolean; onClose: () => void }) => {
  const classes = useStyles();
  const client = useClient();
  const [contactsInvitations, setContactsInvitations] = useState<Record<string, any>[]>([]);
  const [invitations, setInvitations] = useState<Record<string, any>[]>([]);
  const [botDialogVisible, setBotDialogVisible] = useState(false);
  const [copiedSnackBarOpen, setCopiedSnackBarOpen] = useState(false);

  const members: PartyMember[] = useMembers(party);
  const [botFactoryTopic, setBotFactoryTopic] = useState<string | null>();
  const [botFactoryClient, setBotFactoryClient] = useState<BotFactoryClient | null>();
  const [botFactoryConnected, setBotFactoryConnected] = useState(false);
  const [botToSpawn, setBotToSpawn] = useState<string | null>();
  const [botInvitationPending, setBotInvitationPending] = useState(false);
  const [botInvitationError, setBotInvitationError] = useState();
  const [inviteRequestTime, setInviteRequestTime] = useState<number>();

  const [contacts] = useContacts();
  const invitableContacts = contacts?.filter((c) => !members.some((m) => m.publicKey.toHex() === c.publicKey.toHex())); // Contacts not already in this party.

  const [invitationIndex, setInvitationIndex] = useState(1);

  const createInvitation = () => {
    setInvitations([
      {
        id: Date.now(),
        expiration: client.config.invitationExpiration && Date.now() + client.config.invitationExpiration,
        name: `Invitation ${invitationIndex}`
      },
      ...invitations
    ]);
    setInvitationIndex((old) => old + 1);
  };

  const createOfflineInvitation = (contact: Contact) => {
    setContactsInvitations((old) => [...old, { id: Date.now(), contact }]);
  };

  const handleBotInviteClick = () => {
    setBotDialogVisible(true);
    setBotInvitationError(undefined);
  };

  const handleBotInvite = async (botId: string | undefined, spec: Record<string, unknown> = {}) => {
    setBotInvitationError(undefined);
    setBotInvitationPending(true);
    try {
      const secretProvider: any = () => null;

      // Provided by inviter node.
      const secretValidator = async (invitation: any, secret: Buffer) => {
        const signature = secret.slice(0, SIGNATURE_LENGTH);
        const message = secret.slice(SIGNATURE_LENGTH);
        assert(botFactoryTopic);
        return verify(message, signature, keyToBuffer(botFactoryTopic));
      };

      const invitation = await party.createInvitation({ secretValidator, secretProvider });

      assert(botFactoryClient);
      const botUID = await botFactoryClient.sendSpawnRequest(botId);
      assert(botUID);
      await botFactoryClient.sendInvitationRequest(botUID, party.key.toHex(), spec, invitation.toQueryParameters());
      setBotDialogVisible(false);
      // TODO(egorgripasov): Replace 2 calls above once protocol changes are on kube.
      // await botFactoryClient.sendSpawnAndInviteRequest(botId, party.key.toHex(), invitation.toQueryParameters(), {});
      setBotInvitationPending(false);
      await handleBotInvitationEnd();
    } catch (err) {
      console.error(err);
      setBotInvitationPending(false);
      setBotInvitationError(err);
    }
  };

  const handleBotFactorySelect = async (topic: string, force?: boolean) => {
    if (botFactoryTopic !== topic || force) {
      setBotFactoryConnected(false);
      setBotFactoryTopic(topic);
      if (botFactoryTopic && botFactoryClient) {
        await botFactoryClient.close();
      }
      const bfClient = new BotFactoryClient(client.echo.networkManager, topic);
      setBotFactoryClient(bfClient);

      const bfConnected = await bfClient.connect();
      if (bfConnected) {
        setBotFactoryConnected(true);
      }
    }
  };

  const handleBotInvitationEnd = async () => {
    if (botFactoryClient) {
      await botFactoryClient.close();
    }
    setBotFactoryClient(null);
    setBotFactoryTopic(null);
    setBotToSpawn(null);
    setBotFactoryConnected(false);
    setBotDialogVisible(false);
  };

  const handleSubmit = (bot: string | undefined) => {
    setInviteRequestTime(Date.now());
    setBotToSpawn(bot);
  };

  const handleCopy = (value: string) => {
    setCopiedSnackBarOpen(true);
    console.log(value);
  };

  const handleInvitationDone = (invitationId: string) => {
    setInvitations((old) => [
      ...old.filter((invite) => invite.id !== invitationId),
      ...old.filter((invite) => invite.id === invitationId).map((invite) => ({ ...invite, done: true }))
    ]);
  };

  useEffect(() => {
    if (botFactoryConnected && botFactoryTopic && botToSpawn) {
      handleBotInvite(botToSpawn);
    }
  }, [botFactoryConnected, botFactoryTopic, botToSpawn, inviteRequestTime]);

  // TODO(burdon): Columns in EACH section should have same content:
  // [SMALL AVATAR] [NAME] [INVITATION PIN] [MEMBER TYPE] [ACTIONS: e.g., refresh PIN/remove]

  const onlineInvitationsInProgress = invitations.filter((invitation) => !invitation.done).length > 0;

  return (
    <Dialog
      open={open}
      maxWidth='md'
      onClose={onlineInvitationsInProgress ? undefined : onClose} // No click away when in progress
    >
      <DialogTitle>
        <Toolbar variant='dense' disableGutters>
          <PeopleIcon />
          <Typography variant='h5' className={classes.title}>
            Access permissions
          </Typography>
        </Toolbar>
      </DialogTitle>

      <DialogContent>
        <Toolbar variant='dense' disableGutters>
          <div>
            <Button size='small' onClick={createInvitation}>
              Invite User
            </Button>
            <Button size='small' onClick={() => handleBotInviteClick()}>
              Invite Bot
            </Button>
          </div>
        </Toolbar>

        <BotDialog
          open={botDialogVisible}
          invitationPending={botInvitationPending}
          invitationError={botInvitationError}
          onBotFactorySelect={async (bfTopic, force) => handleBotFactorySelect(bfTopic, force)}
          onSubmit={async ({ bot }) => handleSubmit(bot)}
          onClose={() => handleBotInvitationEnd()}
        />

        <Snackbar open={copiedSnackBarOpen} onClose={() => setCopiedSnackBarOpen(false)} autoHideDuration={3000}>
          <Alert
            onClose={() => setCopiedSnackBarOpen(false)}
            severity='success'
            icon={<FileCopyIcon fontSize='inherit' />}
          >
            Invite code copied
          </Alert>
        </Snackbar>

        <TableContainer className={classes.tableContainer}>
          <Table className={classes.table} size='small' padding='none' aria-label='contacts'>
            <TableBody>
              {invitations
                .filter((invitation) => !invitation.done)
                .map((pending) => (
                  <PendingInvitation
                    key={pending.id}
                    party={party}
                    pending={pending}
                    invitationName={pending.name}
                    handleCopy={handleCopy}
                    onInvitationDone={handleInvitationDone}
                    onRenew={() => {
                      setInvitations((old) => [
                        {
                          id: Date.now(),
                          expiration:
                            client.config.invitationExpiration && Date.now() + client.config.invitationExpiration,
                          name: pending.name
                        },
                        ...old.filter((invite) => invite.id !== pending.id)
                      ]);
                    }}
                  />
                ))}
            </TableBody>

            {members.length > 0 && (
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.publicKey.toString()}>
                    <TableCell classes={{ root: classes.colAvatar }}>
                      <MemberAvatar member={member} />
                    </TableCell>
                    <TableCell>{member.displayName || 'Loading...'}</TableCell>
                    <TableCell />
                    <TableCell classes={{ root: classes.colStatus }}>
                      <span className={classes.label}>{member.displayName?.startsWith('bot:') ? 'Bot' : 'Member'}</span>
                    </TableCell>
                    <TableCell classes={{ root: classes.colActions }}>
                      <IconButton size='small'>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}

            {invitableContacts.length > 0 && (
              <TableBody>
                {invitableContacts.map((contact) => (
                  <TableRow key={contact.publicKey.toString()}>
                    <TableCell classes={{ root: classes.colAvatar }}>
                      <MemberAvatar member={contact} />
                    </TableCell>
                    <TableCell>{contact.displayName || 'Loading...'}</TableCell>
                    <TableCell />
                    <TableCell classes={{ root: classes.colStatus }}>
                      <span className={classes.label}>Contact</span>
                    </TableCell>
                    <TableCell classes={{ root: classes.colActions }}>
                      {contactsInvitations.find((p) => p.contact === contact) === undefined ? (
                        <IconButton size='small'>
                          <InviteIcon onClick={() => createOfflineInvitation(contact)} />
                        </IconButton>
                      ) : (
                        <PendingOfflineInvitation
                          handleCopy={handleCopy}
                          party={party}
                          invitation={contactsInvitations.find((p) => p.contact === contact)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color='primary'>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PartySharingDialog;
