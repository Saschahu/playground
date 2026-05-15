import { test } from 'node:test';
import assert from 'node:assert';
import { generateBotName } from './names.js';

test('generates deterministic name from bot_id', () => {
  const id = 'abc-123-def-456';
  const n1 = generateBotName(id);
  const n2 = generateBotName(id);
  assert.strictEqual(n1, n2);
});

test('names follow pattern adj-animal-NN', () => {
  const name = generateBotName('test-seed-xyz');
  assert.match(name, /^[a-z]+-[a-z]+-\d{1,2}$/);
});

test('different ids produce different names (mostly)', () => {
  const names = new Set();
  for (let i = 0; i < 50; i++) {
    names.add(generateBotName(`seed-${i}`));
  }
  assert.ok(names.size >= 20, `only ${names.size} unique names of 50`);
});
