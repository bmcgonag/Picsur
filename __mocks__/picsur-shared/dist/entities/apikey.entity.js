const z = require('zod');

const EApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  user: z.string(),
  created_at: z.string(),
});

module.exports = { EApiKeySchema };
