# Workspace Description — a herdr plugin

Puts a one-line description under each space in the herdr sidebar.

```
▼ acme-web
    main
    fix billing edge case
● acme-api
    feat/rate-limiting
    rate limiting pass
```

The sidebar already shows what agents are doing and which branch each space is
on. This adds the *what* — a description you set once, shown via the
`$description` token, surviving server restarts.

## Requirements

- **herdr ≥ 0.7.4**
- **Bun ≥ 1.0** — must be on PATH; no npm dependencies, no build step

## Install

```bash
herdr plugin install rstacruz/herdr-workspace-description
```

Then add the token row + keybinding to `~/.config/herdr/config.toml`.
**Required** — without it the plugin stores descriptions that nothing renders:

```toml
[ui.sidebar.spaces]
rows = [
  ["state_icon", "workspace"],
  ["branch", "git_status"],
  ["$description"],
]

[[keys.command]]
key = "prefix+shift+e"
type = "plugin_action"
command = "rsc.workspace-description.edit"
description = "edit workspace description"
```

```bash
herdr config check
herdr server reload-config
```

A row disappears entirely when none of its tokens have a value, so spaces
without a description cost no extra height.

## Usage

- **Set from the sidebar** — focus a space, `ctrl+b` then `Shift+E`. A popup
  opens prefilled with the current description: Enter saves, Esc cancels,
  submitting an empty line clears.
- **Set from a script** — report the token directly (lasts until the next
  restart; the popup is the only path that persists):

  ```bash
  herdr workspace report-metadata <id> --source rsc.workspace-description \
    --token description="fix billing edge case"
  ```

  `echo x | herdr plugin action invoke …` is not a script path — herdr 0.8.0
  does not forward piped stdin to actions, so it falls back to the popup.

- **Limits** — keyed by workspace ID; herdr caps values at 80 characters.

## How it works

- **Action** — saves directly when stdin is piped (a channel herdr reserves
  but does not forward yet); opens the popup otherwise.
- **Popup editor** — `node:readline` line editor on an alternate screen.
- **State** — `descriptions.json` under `HERDR_PLUGIN_STATE_DIR`.
- **Token** — `workspace report-metadata` writes `description` (no TTL; it
  lives until the next restart), rendered as `$description`.
- **Restart** — a `[[startup]]` hook re-reports stored descriptions; token
  metadata is not restored across restarts.

## Develop

```bash
herdr plugin link /path/to/herdr-workspace-description
bun test
```

No dependencies, so no install step.

## Troubleshooting

```bash
herdr plugin action list --plugin rsc.workspace-description
herdr workspace list | grep -o '"tokens":{[^}]*}'
```

- **Nothing in the sidebar** — the `[ui.sidebar.spaces] rows` block is
  required; check `herdr config check`.
- **Keybinding does nothing** — `herdr config check` validates TOML but not
  action ids. Compare the `command` against
  `herdr plugin action list --plugin rsc.workspace-description`.
- **`could not open the editor: … ui_busy …`** — a herdr modal (settings,
  copy mode) is open; close it and retry.

## Licence

MIT
