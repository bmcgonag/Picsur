const z = require('zod');

const EUserSchema = z.object({
  username: z.string(),
  id: z.string(),
  roles: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

module.exports = { EUserSchema };
