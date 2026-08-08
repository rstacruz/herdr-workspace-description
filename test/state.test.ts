import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDescriptions, saveDescriptions } from '../lib/state.ts';
import { setDescription, SOURCE } from '../lib/herdr.ts';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ws-desc-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('round-trip: saved map loads back', () => {
  saveDescriptions(dir, { w1: 'fix billing edge case', w2: 'ship tokens' });
  expect(loadDescriptions(dir)).toEqual({ w1: 'fix billing edge case', w2: 'ship tokens' });
});

test('missing state file loads as empty', () => {
  expect(loadDescriptions(dir)).toEqual({});
});

test('corrupt state file loads as empty', () => {
  writeFileSync(join(dir, 'descriptions.json'), '{nope');
  expect(loadDescriptions(dir)).toEqual({});
});

// Empty-string handling: setting an empty description clears the token and
// drops the state entry. A stub herdr records what would be reported.
function withStubHerdr(fn: () => void): string {
  const stubDir = mkdtempSync(join(tmpdir(), 'ws-desc-stub-'));
  const log = join(stubDir, 'log');
  const stub = join(stubDir, 'herdr-stub');
  writeFileSync(stub, `#!/bin/sh\necho "$@" > "${log}"\nexit 0\n`, { mode: 0o755 });
  try {
    const oldBin = process.env.HERDR_BIN_PATH;
    process.env.HERDR_BIN_PATH = stub;
    try {
      fn();
    } finally {
      process.env.HERDR_BIN_PATH = oldBin;
    }
    return readFileSync(log, 'utf8');
  } finally {
    rmSync(stubDir, { recursive: true, force: true });
  }
}

test('empty description clears state and reports --clear-token', () => {
  saveDescriptions(dir, { w1: 'old description' });
  const log = withStubHerdr(() => setDescription(dir, 'w1', ''));
  expect(loadDescriptions(dir)).toEqual({});
  expect(log).toContain('--clear-token description');
  expect(log).toContain(SOURCE);
});

test('description set reports --token and persists', () => {
  const log = withStubHerdr(() => setDescription(dir, 'w1', 'fix billing edge case'));
  expect(loadDescriptions(dir)).toEqual({ w1: 'fix billing edge case' });
  expect(log).toContain('--token description=fix billing edge case');
});
