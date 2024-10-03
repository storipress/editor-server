const { z } = require('zod')
const { destr } = require('destr')

const schema = z.union([
  // compatible with old editor version
  z.literal(''),

  z.object({
    save: z.literal(true),
  }),
  z.object({
    checkServer: z.literal(true),
  }),
  z.object({
    publishArticle: z.literal(true),
  }),
  z.object({
    buildArticle: z.literal(true),
  }),
])
exports.schema = schema

exports.parseJSON = (payload, column, callback) => {
  const message = schema.safeParse(destr(payload))
  if (message.success && message.data !== '' && message.data[column]) {
    callback()
  }
}

exports.parseError = (payload, callback) => {
  const message = schema.safeParse(destr(payload))
  if (!message.success) {
    callback()
  }
}
