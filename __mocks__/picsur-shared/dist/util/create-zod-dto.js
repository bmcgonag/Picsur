import { z } from 'zod';

export function ZodDto(schema) {
  return class {
    static schema = schema;
    static create(data) {
      return schema.parse(data);
    }
  };
}

export function ZodDtoStatic(schema) {
  return ZodDto(schema);
}
