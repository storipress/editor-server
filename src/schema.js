const Sentry = require('@sentry/node')
const { z } = require('zod')

const DEFAULT_DOC = {
  type: 'doc',
  content: [],
}

const DocumentSchema = z
  .object({
    default: z
      .object({
        type: z.string(),
        content: z.array(z.any()),
      })
      .optional()
      .default(DEFAULT_DOC),
    title: z
      .object({
        type: z.string(),
        content: z.array(z.any()),
      })
      .optional()
      .default(DEFAULT_DOC),
    blurb: z
      .object({
        type: z.string(),
        content: z.array(z.any()),
      })
      .optional()
      .default(DEFAULT_DOC),
    annotations: z
      .union([
        z.record(z.string(), z.any()),
        z.array(z.any()).transform((arr) => Object.assign({}, arr)),
      ])
      .optional()
      .default(() => ({})),
  })
  .nullish()
  .default(() => ({
    default: DEFAULT_DOC,
    annotations: {},
  }))

exports.DocumentSchema = DocumentSchema

function ensureDocument(maybeDoc) {
  const res = DocumentSchema.safeParse(maybeDoc)
  if (res.success) {
    return res.data
  }

  Sentry.captureException(res.error)

  return {
    default: DEFAULT_DOC,
    annotations: {},
  }
}

exports.ensureDocument = ensureDocument
