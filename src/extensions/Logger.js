const { logger } = require('../utils/logger')
/**
 * @implements {import('@hocuspocus/server').Extension}
 */
module.exports.Logger = class Logger {
  /** @type {string|null} */
  name = null

  configuration = {
    prefix: null,
    onLoadDocument: true,
    onChange: true,
    onStoreDocument: true,
    onConnect: true,
    onDisconnect: true,
    onUpgrade: true,
    onRequest: true,
    onDestroy: true,
    onConfigure: true,
    log: logger.info.bind(logger), // eslint-disable-line
  }

  /**
   * Constructor
   */
  constructor(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  async onConfigure(data) {
    this.name = data.instance.configuration.name

    if (!this.configuration.onConfigure) {
      return
    }

    if (this.configuration.prefix) {
      console.warn(
        "[hocuspocus warn] The Logger 'prefix' is deprecated. Pass a 'name' to the Hocuspocus configuration instead.",
      )
    }
  }

  async onLoadDocument(data) {
    if (this.configuration.onLoadDocument) {
      this.log(`Loaded document "${data.documentName}".`, {
        hook: 'onLoadDocument',
        clients_count: data.clientsCount,
        context: data.context,
        document_name: data.documentName,
        req: data.request,
        socket_id: data.socketId,
      })
    }
  }

  async onChange(data) {
    if (this.configuration.onChange) {
      this.log(`Document "${data.documentName}" changed.`, {
        hook: 'onChange',
        clients_count: data.clientsCount,
        context: data.context,
        document_name: data.documentName,
        req: data.request,
        socket_id: data.socketId,
      })
    }
  }

  async onStoreDocument(data) {
    if (this.configuration.onStoreDocument) {
      this.log(`Store "${data.documentName}".`, {
        hook: 'onStoreDocument',
        clients_count: data.clientsCount,
        context: data.context,
        document_name: data.documentName,
        req: data.request,
        socket_id: data.socketId,
      })
    }
  }

  async onStateless(data) {
    this.log(`Statless message`, {
      hook: 'onStateless',
      document_name: data.documentName,
      payload: data.payload,
      context: data.connection.context,
    })
  }

  async onConnect(data) {
    if (this.configuration.onConnect) {
      this.log(`New connection to "${data.documentName}".`, {
        hook: 'onConnect',
        document_name: data.documentName,
        req: data.request,
        socket_id: data.socketId,
      })
    }
  }

  async onDisconnect(data) {
    if (this.configuration.onDisconnect) {
      this.log(`Connection to "${data.documentName}" closed.`, {
        hook: 'onDisconnect',
        clients_count: data.clientsCount,
        context: data.context,
        document_name: data.documentName,
        req: data.request,
        socket_id: data.socketId,
      })
    }
  }

  async onUpgrade(data) {
    if (this.configuration.onUpgrade) {
      this.log('Upgrading connection …', {
        hook: 'onUpgrade',
        context: data.context,
        document_name: data.documentName,
        req: data.request,
        socket_id: data.socketId,
      })
    }
  }

  async onRequest(data) {
    if (this.configuration.onRequest) {
      this.log(`Incoming HTTP Request to ${data.request.url}`, {
        hook: 'onRequest',
        clients_count: data.clientsCount,
        context: data.context,
        document_name: data.documentName,
        req: data.request,
        socket_id: data.socketId,
      })
    }
  }

  async onDestroy(data) {
    if (this.configuration.onDestroy) {
      this.log('Shut down.', {
        hook: 'onDestroy',
      })
    }
  }

  log(message, context = {}) {
    const date = new Date().toISOString()
    let meta = `${date}`

    if (this.name) {
      meta = `${this.name} ${meta}`
    }

    message = `[${meta}] ${message}`

    this.configuration.log(context, message)
  }
}
