import { Hono, Env } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { documents } from './model'
import { eq } from 'drizzle-orm'
import { Database } from './db'
import { createProvider, writeField } from './editor'
import { JSONContent } from '@tiptap/core'

export interface Context {
  db: Database
  [k: string]: unknown
}

interface AppEnv extends Env {
  Bindings: Context
}

const EMPTY_DOCUMENT: JSONContent = {
  type: 'doc',
  content: [],
}

const route = new Hono<AppEnv>()

const CONTENT_FIELD = 'default'
const TITLE_FIELD = 'title'
const BLURB_FIELD = 'blurb'

const DocumentIdentSchema = z.object({
  client_id: z.string(),
  article_id: z.string(),
})

type DocumentIdent = z.infer<typeof DocumentIdentSchema>

const ClearCacheInputSchema = DocumentIdentSchema

const ReplaceCacheInputSchema = DocumentIdentSchema.extend({
  document: z.object({
    title: z.record(z.any()),
    blurb: z.record(z.any()),
    default: z.record(z.any()),
  }),
})

export const app = route
  .post(
    '/api/clear-cache',
    zValidator('json', ClearCacheInputSchema),
    async (c) => {
      const body = c.req.valid('json')
      const articleName = getDocumentName(body)

      await c.env.db.delete(documents).where(eq(documents.name, articleName))

      return c.json({ ok: true })
    },
  )
  .post(
    '/api/replace-cache',
    zValidator('json', ReplaceCacheInputSchema),
    async (c) => {
      const body = c.req.valid('json')

      const provider = createProvider(getDocumentName(body))
      await provider.connect()

      writeField(
        provider,
        CONTENT_FIELD,
        body.document.default ?? EMPTY_DOCUMENT,
      )
      writeField(provider, TITLE_FIELD, body.document.title ?? EMPTY_DOCUMENT)
      writeField(provider, BLURB_FIELD, body.document.blurb ?? EMPTY_DOCUMENT)

      provider.destroy()

      return c.json({ ok: true })
    },
  )

function getDocumentName(body: DocumentIdent) {
  return `${body.client_id}.${body.article_id}`
}
