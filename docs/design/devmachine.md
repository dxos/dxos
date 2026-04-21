# Dev Machine

Runbook for setting up a remote Ubuntu dev machine in the cloud, accessible from macOS via NoMachine (NX protocol). Designed as a from-scratch recipe.

## Variables used in this guide

Substitute these throughout. Examples used: `HOST=naga`, `USER=dima`.

- `$HOST` — short name / SSH alias you'll use locally (e.g. `naga`, `devbox`)
- `$USER` — Linux username on the machine (e.g. `dima`, `alice`) — typically matches your GitHub handle
- `$IP` — the droplet's public IP (obtained at step 1)

---

## 1. Provision the droplet

On [DigitalOcean](https://cloud.digitalocean.com/) → **Create → Droplets**:

- **OS**: Ubuntu 24.04 LTS (x64)
- **Size**: Largest you can afford, **Premium AMD** CPU (anecdotally faster than the Intel option for dev / compile workloads — higher clocks, newer silicon)
- **Authentication**: SSH key — paste your public key (`~/.ssh/id_ed25519.pub`). *Don't* use password auth.
- **Hostname**: `$HOST`
- Consider adding a **Cloud Firewall** at the same time: allow port `22` from your IP and allow port `4000` from your IP (or skip 4000 and use the SSH tunnel option in step 8).

After provisioning you'll have an IP — that's `$IP`.

---

## 2. SSH config and initial user

Add to `~/.ssh/config` on the Mac:

```sshconfig
Host $HOST
    HostName $IP
    User $USER
    IdentitiesOnly yes
    ForwardAgent yes
    ServerAliveInterval 60
```

Droplets come with only `root`. Create your own user with passwordless sudo:

```bash
ssh root@$IP "
  adduser --disabled-password --gecos '' $USER &&
  usermod -aG sudo $USER &&
  echo '$USER ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/90-$USER &&
  mkdir -p /home/$USER/.ssh &&
  cp ~/.ssh/authorized_keys /home/$USER/.ssh/ &&
  chown -R $USER:$USER /home/$USER/.ssh &&
  chmod 700 /home/$USER/.ssh &&
  chmod 600 /home/$USER/.ssh/authorized_keys
"
```

Confirm: `ssh $HOST` works and `ssh $HOST sudo -n true` returns silently.

---

## 3. Set a Linux password for the user

Needed for NoMachine PAM auth and GUI polkit prompts. SSH key login stays unchanged.

```bash
ssh -t $HOST "sudo passwd $USER"
```

---

## 4. Install a lightweight desktop environment

XFCE is preferred on a headless cloud VM — lighter than GNOME, no graphics-hardware assumptions, works flawlessly with NoMachine's virtual-display mode.

```bash
ssh $HOST 'sudo apt update && sudo apt install -y xfce4 xfce4-goodies xclip'
```

Do **not** install `ubuntu-desktop` / full GNOME — it pulls in display-manager dependencies that assume real hardware.

---

## 5. Disable any display manager

Display managers like LightDM or GDM try to run a session on the non-existent physical display and conflict with NoMachine's virtual-desktop mode (you'll end up shadowing their failing greeter).

```bash
ssh $HOST '
  if systemctl list-unit-files | grep -qE "^(lightdm|gdm3?|sddm)\.service"; then
    sudo systemctl disable --now lightdm gdm3 gdm sddm 2>/dev/null || true
  fi
  sudo systemctl set-default multi-user.target
'
```

---

## 6. Install NoMachine server

Check the current version at https://www.nomachine.com/download then install the `.deb`:

```bash
NM_VERSION=9.4.14
ssh $HOST "
  cd /tmp &&
  wget -q https://download.nomachine.com/download/${NM_VERSION%.*}/Linux/nomachine_${NM_VERSION}_1_amd64.deb &&
  sudo dpkg -i nomachine_${NM_VERSION}_1_amd64.deb &&
  rm nomachine_${NM_VERSION}_1_amd64.deb
"
```

Verify:

```bash
ssh $HOST 'sudo /etc/NX/nxserver --status && sudo ss -tlnp | grep 4000'
```

Expect `nxd` listening on `0.0.0.0:4000`.

---

## 7. Configure NoMachine for XFCE virtual desktops

Point the default virtual-desktop command at `startxfce4` (the default is `gnome-session`, which we deliberately didn't install). Also bump the default resolution from `1024x768`.

```bash
ssh $HOST '
  sudo cp /usr/NX/etc/node.cfg /usr/NX/etc/node.cfg.bak &&
  sudo sed -i "s|^DefaultDesktopCommand .*|DefaultDesktopCommand \"/etc/X11/Xsession startxfce4\"|" /usr/NX/etc/node.cfg &&
  sudo sed -i "s|^#\?DisplayAgentExtraOptions.*|DisplayAgentExtraOptions \"-geometry 3456x2234+0+0 -dpi 144\"|" /usr/NX/etc/node.cfg
'
```

The `-geometry` targets a 14" MBP Retina panel and `-dpi 144` gives crisp text on HiDPI displays. Adjust to match your Mac's native resolution (`system_profiler SPDisplaysDataType | grep -i resolution`).

Leave `AvailableSessionTypes` at its installed default — internal session-type fallbacks rely on the full list. Stripping it breaks virtual-desktop creation with `Session type is not available on node`.

---

## 8. Grant the user rights to create virtual desktops

Default `VirtualDesktopAccess` restricts session creation to `administrator,trusted,owner,system`. A plain system user has none of those for the NX node.

```bash
ssh $HOST "
  sudo /etc/NX/nxserver --useredit $USER --trusted virtual &&
  sudo /etc/NX/nxserver --useredit $USER --administrator yes &&
  sudo /etc/NX/nxserver --restart
"
```

Verify:

```bash
ssh $HOST 'sudo /etc/NX/nxserver --userlist'
```

`$USER` should show `NX administrator: yes` and `Trusted virtual for: all nodes and users`.

---

## 9. Lock down port 4000 (pick one)

Port 4000 is **publicly exposed** after install. Pick one:

### Option A — SSH tunnel (most secure, no open port)

```bash
ssh $HOST 'sudo ufw allow 22/tcp && sudo ufw deny 4000/tcp && sudo ufw --force enable'
```

When you want to connect, open a tunnel from the Mac:

```bash
ssh -L 4000:localhost:4000 $HOST
```

…and point the NoMachine client at `localhost:4000`.

### Option B — UFW restricted to your IP (or use the DO cloud firewall)

```bash
MY_IP=$(curl -s https://api.ipify.org)
ssh $HOST "
  sudo ufw allow 22/tcp &&
  sudo ufw allow from ${MY_IP} to any port 4000 proto tcp &&
  sudo ufw --force enable
"
```

### Option C — Leave it open (not recommended)

NoMachine PAM auth guards it, but bots will brute-force.

---

## 10. Connect from the Mac

1. Install the NoMachine macOS client: https://www.nomachine.com/download/macos
2. Grant Accessibility + Screen Recording permissions on first launch
3. New connection:
   - **Host**: `$IP` (or `localhost` with SSH tunnel)
   - **Port**: `4000`
   - **Protocol**: `NX`
   - **User**: `$USER` / Linux password from step 3
4. Session chooser → **New desktop** → **Create a new custom session running X** → leave command blank → XFCE.

### Recommended client tweaks

Open the **page-peel menu** in a running session (top-right corner, or `Ctrl+Alt+0`):

- **Display → Resize remote display to match the client** — desktop auto-resizes with the window
- **Display → Change settings → Quality** → slider all the way to the right
- **Display → Encoding** → switch from *H.264* (default, causes "soapy"/smeared text) to **Lossless** or **MJPEG** — this is the single biggest text-sharpness win
- Optional: inside the session, `xfconf-query -c xsettings -p /Xft/DPI -s 144` (log out/in) for crisper XFCE fonts on Retina

In the connection's persistent settings (main NoMachine window → edit connection):

- **"When I disconnect from the server" → "Keep the session running"** — closing the NoMachine window suspends the session so all apps keep running on the droplet; reconnecting picks up exactly where you left off. Verify with `ssh $HOST 'sudo /etc/NX/nxserver --list'` — `-` under *Remote IP* means suspended & alive.
- **"Use custom server resolution"** → set to your Mac's native pixel resolution if you don't want dynamic resizing.

### Keyboard shortcuts reminder

Inside the NoMachine session you're on **Linux**, not macOS — use `Ctrl` instead of `Cmd`:

- Copy: `Ctrl+C` (or `Ctrl+Shift+C` in terminals)
- Paste: `Ctrl+V` (or `Ctrl+Shift+V` in terminals)
- Clipboard sync between Mac ↔ Ubuntu is bidirectional by default — nothing to configure.

---

## 11. GitHub CLI + git setup

Authenticate once via `gh` and let it configure `git` credentials automatically:

```bash
ssh -t $HOST '
  sudo apt install -y gh git &&
  gh auth login
'
```

Answer:

- **Account**: GitHub.com
- **Protocol**: HTTPS
- **Authenticate Git with credentials**: Yes
- **How would you like to authenticate**: Login with a web browser (copy the one-time code, open the URL on your Mac)

Then basic git identity:

```bash
ssh $HOST "
  git config --global user.name 'Your Name' &&
  git config --global user.email 'you@example.com' &&
  git config --global pull.rebase true
"
```

SSH agent forwarding is already enabled in the `~/.ssh/config` from step 2, so `git push` over SSH from `$HOST` will reuse your Mac's keys.

---

## 12. Install Claude Desktop

Uses the unofficial `claude-desktop-debian` packaging:

```bash
ssh $HOST '
  cd ~ &&
  git clone https://github.com/aaddrick/claude-desktop-debian.git &&
  cd claude-desktop-debian &&
  ./build.sh --build deb &&
  sudo dpkg -i claude-desktop_*_amd64.deb
'
```

Launch from the XFCE menu or `claude-desktop`.

---

## 13. Install Claude Code (CLI) + API key

```bash
ssh $HOST '
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - &&
  sudo apt install -y nodejs &&
  sudo npm install -g @anthropic-ai/claude-code
'
```

Add your Anthropic API key to the Claude Code config so tasks run unattended in the session. The config lives at `~/.claude.json`:

```bash
ssh $HOST 'cat > ~/.claude.json' <<'EOF'
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }
}
EOF
ssh $HOST 'chmod 600 ~/.claude.json'
```

Replace `sk-ant-...` with your key (from https://console.anthropic.com/settings/keys).

Alternatively, export it in `~/.bashrc`:

```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' | ssh $HOST 'tee -a ~/.bashrc >/dev/null'
```

Verify:

```bash
ssh $HOST 'claude --version && claude -p "ping"'
```

---

## 14. Known quirks

### Claude Desktop zombie instance

If Claude was running when the X display changed (e.g. DM killed, session restarted), subsequent launches silently no-op: Electron finds its SingletonLock, tries to focus a window on a dead display, exits with code 0.

Fix:

```bash
pkill -9 -f "/usr/lib/claude-desktop/node_modules/electron"
rm -f ~/.config/Claude/Singleton{Lock,Socket,Cookie}
claude-desktop
```

### "Wayland detected" in Claude launcher log

The launcher reads `WAYLAND_DISPLAY` and logs "Wayland detected" inside NoMachine's X session. Harmless — it still uses `--ozone-platform=x11`.

---

## Reference: useful commands

```bash
# NoMachine server
sudo /etc/NX/nxserver --status
sudo /etc/NX/nxserver --restart
sudo /etc/NX/nxserver --list                       # active sessions
sudo /etc/NX/nxserver --terminate <session-id>

# Users / permissions
sudo /etc/NX/nxserver --userlist
sudo /etc/NX/nxserver --useredit <user> --trusted virtual
sudo /etc/NX/nxserver --useredit <user> --administrator yes

# Logs
sudo tail -f /usr/NX/var/log/server.log            # server-wide
cat ~/.nx/node/<session-id>/session                # per-session nxagent
tail -f ~/.cache/claude-desktop-debian/launcher.log
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Arrive at display-manager greeter inside NoMachine | Client is shadowing the physical display | Disable DM (step 5), reconnect |
| "Failed to start session" at greeter | DM can't launch XFCE on fake hardware | Same as above |
| "Cannot create a new display" | Broken `AvailableSessionTypes` config | Reinstall `/usr/NX/etc/node.cfg` defaults |
| "New desktop" button grayed out | User lacks virtual-desktop access rights | Step 8 |
| NoMachine auth fails with "Username is not in the expected format" | Empty username in client | Re-enter credentials |
| Claude Desktop launches but no window | Zombie Electron holding SingletonLock | Step 14 quirk |
| Low default resolution (1024x768) | `DisplayAgentExtraOptions` unset | Step 7; or client-side *Resize remote display* |
| Text looks soapy / smeared / over-smoothed | H.264 video encoding default (great for video, awful for text) | Client → Display → Encoding → **Lossless** or **MJPEG** |
| Copy/paste doesn't work between Mac and Ubuntu | Using `Cmd` instead of `Ctrl` inside the Linux session | Use `Ctrl+C` / `Ctrl+V` — clipboard sync is on by default |
