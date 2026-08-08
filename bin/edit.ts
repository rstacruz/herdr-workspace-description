import { openPluginPane, setDescription, SOURCE } from '../lib/herdr.ts';

function fail(message: string): never {
  process.stderr.write(`${SOURCE}: ${message}\n`);
  process.exit(1);
}

function focusedWorkspaceId(): string {
  const direct = process.env.HERDR_WORKSPACE_ID;
  if (direct) return direct;
  try {
    const ctx = JSON.parse(process.env.HERDR_PLUGIN_CONTEXT_JSON ?? '{}');
    return ctx?.workspace?.workspace_id ?? '';
  } catch {
    return '';
  }
}

// herdr 0.8.0 spawns actions with the server's stdin (TTY or EOF-empty), so
// this branch cannot fire via the CLI — it does not forward pipes. It is the
// documented stdin contract for plugin commands, so keep it: the day herdr
// forwards stdin, a pipe saves directly instead of opening the popup.
async function readPipedInput(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  process.stdin.setEncoding('utf8');
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data === '' ? null : data;
}

const wsId = focusedWorkspaceId();
if (!wsId) fail('could not determine the focused workspace (HERDR_WORKSPACE_ID not set)');

const piped = await readPipedInput();
if (piped !== null) {
  setDescription(process.env.HERDR_PLUGIN_STATE_DIR ?? '.', wsId, piped.trim());
  process.exit(0);
}

const res = openPluginPane('edit', { envVars: { WSPACE_ID: wsId } });
if (!res.ok) {
  const hint = res.error.toLowerCase().includes('ui_busy') ? ' (close the open herdr modal first)' : '';
  fail(`could not open the editor: ${res.error}${hint}`);
}
process.exit(0);
