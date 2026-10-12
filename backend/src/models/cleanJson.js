/**
 * Shared toJSON transform: exposes `id` instead of `_id`/`__v` and
 * guarantees the password hash can never be serialised into a response.
 */
module.exports = function cleanJson(schema) {
  schema.set('toJSON', {
    transform(doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      return ret;
    },
  });
};
