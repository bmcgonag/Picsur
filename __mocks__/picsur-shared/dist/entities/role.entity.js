const z = require('zod');

const ERoleSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string()),
});

module.exports = { ERoleSchema };
