const z = require('zod');

const EImageSchema = z.object({
  uuid: z.string(),
  filename: z.string(),
  mimetype: z.string(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  user_id: z.string().nullable(),
});

module.exports = { EImageSchema };
