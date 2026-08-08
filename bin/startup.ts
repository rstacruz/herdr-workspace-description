import { reportMetadata, SOURCE } from '../lib/herdr.ts';
import { loadDescriptions } from '../lib/state.ts';

// Tokens are not restored across restarts; re-report every stored description
// so the sidebar comes back after a server start or live handoff. Dead
// workspace IDs linger harmlessly in the file (never rendered) — no pruning.
const stateDir = process.env.HERDR_PLUGIN_STATE_DIR ?? '.';
const map = loadDescriptions(stateDir);
let ok = 0;
for (const [workspaceId, description] of Object.entries(map)) {
  if (reportMetadata(workspaceId, { description }).ok) ok++;
}
process.stdout.write(`${SOURCE}: re-reported ${ok}/${Object.keys(map).length} descriptions\n`);
process.exit(0);
