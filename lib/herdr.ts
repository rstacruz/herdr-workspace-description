import { spawnSync } from 'node:child_process';
import { loadDescriptions, saveDescriptions } from './state.ts';

export const SOURCE = 'rstacruz.workspace-description';
// No --ttl-ms on purpose: herdr caps it at 24h, and omitting it means the
// token lives until the next restart — when the startup hook re-reports it.
export function herdrBin(env = process.env) {
  return env.HERDR_BIN_PATH || 'herdr';
}

// `workspace report-metadata` succeeds with empty stdout, so success is the
// exit code; parsing is a separate concern for commands that do return a body.
function cli(args: string[], { env = process.env }: { env?: NodeJS.ProcessEnv } = {}) {
  const res = spawnSync(herdrBin(env), args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });
  const status = res.status ?? 1;
  if (status !== 0) {
    return { ok: false, stdout: res.stdout ?? '', error: (res.stderr || res.stdout || '').trim() };
  }
  return { ok: true, stdout: res.stdout ?? '', error: null };
}

// tokens is a patch: a string sets a key, null clears it, an omitted key is
// left alone. herdr accepts at most 16 keys per report.
export function reportMetadata(
  workspaceId: string,
  tokens: Record<string, string | null>,
  { env }: { env?: NodeJS.ProcessEnv } = {},
) {
  const args = ['workspace', 'report-metadata', workspaceId, '--source', SOURCE];
  for (const [key, value] of Object.entries(tokens)) {
    if (value == null) args.push('--clear-token', key);
    else args.push('--token', `${key}=${value}`);
  }
  return cli(args, { env });
}

// Omitting --placement lets the manifest's own placement apply, which matters
// for popup: the CLI's accepted values lag the manifest's and reject it.
export function openPluginPane(
  entrypoint: string,
  { envVars, env }: { envVars?: Record<string, string>; env?: NodeJS.ProcessEnv } = {},
) {
  const args = ['plugin', 'pane', 'open', '--plugin', SOURCE, '--entrypoint', entrypoint, '--focus'];
  for (const [key, value] of Object.entries(envVars ?? {})) args.push('--env', `${key}=${value}`);
  return cli(args, { env });
}

// Persist + report a description. Empty string clears: no token, no state.
export function setDescription(stateDir: string, workspaceId: string, value: string | null) {
  const map = loadDescriptions(stateDir);
  const normalized = value == null || value === '' ? null : value;
  if (normalized === null) delete map[workspaceId];
  else map[workspaceId] = normalized;
  saveDescriptions(stateDir, map);
  return reportMetadata(workspaceId, { description: normalized });
}
