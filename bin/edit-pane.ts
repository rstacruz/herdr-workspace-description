import readline from 'node:readline';
import { setDescription, SOURCE } from '../lib/herdr.ts';
import { loadDescriptions } from '../lib/state.ts';

// Popup editor: a single-line readline prompt on an alternate screen. The
// popup is session-modal and receives every key, including Escape.
const ESC = '\u001b';
const ALT_SCREEN_ON = `${ESC}[?1049h`;
const ALT_SCREEN_OFF = `${ESC}[?1049l`;
const CURSOR_HIDE = `${ESC}[?25l`;
const CURSOR_SHOW = `${ESC}[?25h`;

const wsId = process.env.WSPACE_ID ?? '';
if (!wsId) {
  process.stderr.write(`${SOURCE}: WSPACE_ID not set\n`);
  process.exit(1);
}

const stateDir = process.env.HERDR_PLUGIN_STATE_DIR ?? '.';
const current = loadDescriptions(stateDir)[wsId] ?? '';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

// Esc and Ctrl+C cancel without saving; the alt screen must be restored
// before the process exits or the terminal is left half-raw.
function quit(code: number) {
  process.stdout.write(CURSOR_SHOW + ALT_SCREEN_OFF);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.exit(code);
}

rl.input.on('keypress', (str: string, key: { name?: string; ctrl?: boolean }) => {
  if (key.name === 'escape' || (key.ctrl && key.name === 'c')) quit(0);
});
rl.on('SIGINT', () => quit(0));
rl.on('close', () => quit(0));

// Enter saves; an empty line clears (no separate clear action).
rl.on('line', (line) => {
  const value = line.trim();
  setDescription(stateDir, wsId, value === '' ? null : value);
  quit(0);
});

for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => quit(0));

process.stdout.write(ALT_SCREEN_ON + CURSOR_HIDE);
rl.setPrompt('description: ');
rl.prompt();
rl.write(current);
