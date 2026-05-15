import { test } from 'node:test';
import assert from 'node:assert';
import { validateBotId } from './identify.js';

test('valid uuid v4 passes', () => {
  assert.strictEqual(validateBotId('d4f6e2a1-9c8b-4a3e-b2f1-1e2d3c4b5a6f'), 'd4f6e2a1-9c8b-4a3e-b2f1-1e2d3c4b5a6f');
});

test('non-uuid throws', () => {
  assert.throws(() => validateBotId('not-a-uuid'));
  assert.throws(() => validateBotId(''));
  assert.throws(() => validateBotId(null));
});
