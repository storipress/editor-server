import { Extension, onRequestPayload } from '@hocuspocus/server'
import { Database, connect } from './db'
import { app } from './server'
import { getRequestListener } from '@hono/node-server'

export { INTERNAL_AUTH_PARAM, INTERNAL_AUTH_VALUE } from './editor'

export class ExtensionAPI implements Extension {
  databasePath: string
  db: Database
  handler: ReturnType<typeof getRequestListener>

  constructor({ database }: { database: string }) {
    this.databasePath = database
    this.db = connect(database)
    this.handler = getRequestListener((request) =>
      app.fetch(request, { db: this.db }),
    )
  }

  async onRequest({ request, response }: onRequestPayload): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (request.url && request.url.startsWith('/api/')) {
        await this.handler(request, response)
        // Reject to let HocusPocus know that we already handle the request
        return reject()
      }
      return resolve()
    })
  }
}
