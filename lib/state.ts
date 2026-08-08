import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// descriptions.json: { [workspaceId]: description }
const FILE = 'descriptions.json';

export function loadDescriptions(dir: string): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(dir, FILE), 'utf8'));
  } catch {
    return {};
  }
}

// Write via a temp file + rename so a concurrent reader (startup re-report
// racing an edit) never sees a truncated JSON file.
export function saveDescriptions(dir: string, map: Record<string, string>): void {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, FILE);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(map, null, 2) + '\n');
  renameSync(tmp, file);
}
