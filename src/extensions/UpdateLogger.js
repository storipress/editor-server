const { logger } = require('../utils/logger')
const { decodeUpdate } = require('yjs')

/**
 * @implements {import('@hocuspocus/server').Extension}
 */
module.exports.UpdateLogger = class UpdateLogger {
  async onLoadDocument(data) {
    data.document.on('update', (update) => {
      try {
        const { structs, ds } = decodeUpdate(update)
        this.log(`Update document "${data.documentName}".`, {
          hook: 'update',
          clients_count: data.document.getClients().size,
          document_name: data.documentName,
          socket_id: data.socketId,
          data: Array.from(update),
          structs,
          ds: { clients: Array.from(ds.clients.entries()) },
        })
      } catch (err) {
        logger.error({ err })
      }
    })
  }

  log(message, context = {}) {
    const date = new Date().toISOString()
    let meta = `${date}`

    if (this.name) {
      meta = `${this.name} ${meta}`
    }

    message = `[${meta}] ${message}`

    logger.info(context, message)
  }
}
