import { describe, it, expect } from 'vitest';
import { deriveKey, kdfParams, randomSalt } from '../src/kdf.js';

describe('kdfParams', () => {
  it('returns ops + mem for each strength', async () => {
    const i = await kdfParams('INTERACTIVE');
    const m = await kdfParams('MODERATE');
    const s = await kdfParams('SENSITIVE');
    expect(i.ops_limit).toBeGreaterThan(0);
    expect(m.ops_limit).toBeGreaterThan(i.ops_limit);
    expect(s.ops_limit).toBeGreaterThanOrEqual(m.ops_limit);
    expect(s.mem_limit).toBeGreaterThanOrEqual(m.mem_limit);
  });
});

describe('randomSalt', () => {
  it('returns 16 bytes', async () => {
    const a = await randomSalt();
    expect(a.length).toBe(16);
  });
  it('returns different salts on subsequent calls', async () => {
    const a = await randomSalt();
    const b = await randomSalt();
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe('deriveKey', () => {
  it('is deterministic for the same password+salt+params', async () => {
    const salt = await randomSalt();
    const p = await kdfParams('INTERACTIVE');
    const k1 = await deriveKey('hunter2', salt, p.ops_limit, p.mem_limit);
    const k2 = await deriveKey('hunter2', salt, p.ops_limit, p.mem_limit);
    expect(k1.length).toBe(32);
    expect(Buffer.from(k1).equals(Buffer.from(k2))).toBe(true);
  });

  it('produces a different key for a different password', async () => {
    const salt = await randomSalt();
    const p = await kdfParams('INTERACTIVE');
    const k1 = await deriveKey('hunter2', salt, p.ops_limit, p.mem_limit);
    const k2 = await deriveKey('hunter3', salt, p.ops_limit, p.mem_limit);
    expect(Buffer.from(k1).equals(Buffer.from(k2))).toBe(false);
  });
});
