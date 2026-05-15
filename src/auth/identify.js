const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateBotId(botId) {
  if (typeof botId !== 'string') throw new Error('bot_id must be string');
  if (!UUID_V4.test(botId)) throw new Error('bot_id must be uuid v4');
  return botId;
}
