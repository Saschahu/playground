const ADJECTIVES = [
  'calm', 'quiet', 'bright', 'stoic', 'curious', 'wise', 'eager', 'patient',
  'humble', 'brave', 'gentle', 'swift', 'silent', 'keen', 'kind', 'bold',
  'thoughtful', 'careful', 'steady', 'watchful'
];

const ANIMALS = [
  'otter', 'fox', 'raven', 'heron', 'badger', 'wolf', 'hare', 'lynx',
  'crane', 'newt', 'owl', 'mole', 'finch', 'stoat', 'gull', 'shrew',
  'mink', 'falcon', 'sable', 'auk'
];

export function generateBotName(seedId) {
  const seed = seedId
    ? seedId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    : Math.floor(Math.random() * 1e9);
  const adj = ADJECTIVES[seed % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(seed / ADJECTIVES.length) % ANIMALS.length];
  const num = (seed % 99) + 1;
  return `${adj}-${animal}-${num}`;
}
