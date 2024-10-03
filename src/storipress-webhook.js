const { Webhook, Events } = require('@hocuspocus/extension-webhook')
const workerpool = require('workerpool')
const Sentry = require('@sentry/node')
const { ensureDocument } = require('./schema')
const pRetry = require('p-retry')
const axios = require('axios').default
const pkg = require('./package.json')
const { parseJSON } = require('./utils/parseJSON.js')
const { logger } = require('./utils/logger.js')
const pool = workerpool.pool('./generate-worker.js')
const {
  INTERNAL_AUTH_PARAM,
  INTERNAL_AUTH_VALUE,
} = require('@storipress/extension-api')

/**
 * @implements {import('@hocuspocus/server').Extension}
 */
exports.StoripressWebhook = class StoripressWebhook extends Webhook {
  /**
   * Send a request to the given url containing the given data
   * override to add the user agent
   */

  sendRequest(event, payload) {
    const json = JSON.stringify({ event, payload })

    return pRetry(
      () =>
        axios.post(this.configuration.url, json, {
          headers: {
            'X-Hocuspocus-Signature-256': this.createSignature(json),
            'User-Agent': `storipress-hocuspocus/${pkg.version}`,
          },
          validateStatus: function (status) {
            return status < 500 // Resolve only if the status code is less than 500
          },
        }),
      {
        retries: 2,
        onFailedAttempt: (err) => {
          logger.error(
            {
              error_type: 'webhook-error',
              err,
              attemptNumber: err.attemptNumber,
              retriesLeft: err.retriesLeft,
            },
            'Fail to send webhook',
          )
        },
      },
    )
  }

  async save(data) {
    const transYdoc = this.configuration.transformer.fromYdoc(data.document)
    const savedValues = {
      document: transYdoc,
      documentName: data.documentName,
      context: data.context,
      requestHeaders: data.requestHeaders,
      requestParameters: Object.fromEntries(data.requestParameters.entries()),
    }

    try {
      const generateResult = await pool.exec('generateResult', [
        {
          documentName: data.documentName,
          content: transYdoc.default,
        },
      ])
      await this.sendRequest(Events.onChange, {
        ...generateResult,
        ...savedValues,
      })
    } catch (err) {
      Sentry.captureException(err)
      logger.error(
        {
          error_type: 'generate-html-error',
          err,
          document_name: data.documentName,
          context: data.context,
        },
        'Fail to create html and plaintext',
      )
      try {
        await this.sendRequest(Events.onChange, savedValues)
      } catch (err) {
        Sentry.captureException(err)
        logger.error(
          {
            error_type: 'save-error',
            err,
            document_name: data.documentName,
            context: data.context,
          },
          'Fail to send save webhook',
        )
        return
      }
    }
    logger.info(
      {
        hook: 'save',
        document_name: data.documentName,
        context: data.context,
      },
      'Save document',
    )
  }

  onChange(data) {
    if (!this.configuration.events.includes(Events.onChange)) {
      return
    }

    // skip write back for internal request
    // FIXME: no idea why it's not working
    if (
      data.requestParameters.get(INTERNAL_AUTH_PARAM) === INTERNAL_AUTH_VALUE
    ) {
      return
    }

    if (!this.configuration.debounce) {
      this.save(data)
    }

    this.debounce(data.documentName, () => this.save(data))
  }

  async onStateless({ payload, documentName, document, connection }) {
    const savedData = {
      document,
      documentName,
      context: connection.context,
      requestHeaders: {},
      requestParameters: [],
    }
    parseJSON(payload, 'publishArticle', async () => {
      await this.save(savedData)
      logger.info(
        {
          hook: 'publish',
          document_name: documentName,
          context: connection.context,
        },
        'send publish message',
      )
      connection.sendStateless(payload)
    })
    parseJSON(payload, 'buildArticle', async () => {
      await this.save(savedData)
      logger.info(
        {
          hook: 'build',
          document_name: documentName,
          context: connection.context,
        },
        'send build message',
      )
      connection.sendStateless(payload)
    })
    parseJSON(payload, 'save', () => this.save(savedData))
  }

  /**
   * override the onLoadDocument hook to provide
   * - extra Sentry context
   * - basic document validation
   * - initialized check, so we don't append the same document twice
   *
   * @param {import('@hocuspocus/server').onLoadDocumentPayload} data
   */
  async onLoadDocument(data) {
    if (!this.configuration.events.includes(Events.onCreate)) {
      return
    }

    const [clientID, documentID] = data.documentName.split('.')
    Sentry.setUser({ id: data.documentName, clientID, documentID })

    // It's from internal request, skip the loading check
    if (
      data.requestParameters.get(INTERNAL_AUTH_PARAM) === INTERNAL_AUTH_VALUE
    ) {
      return
    }

    const response = await this.sendRequest(Events.onCreate, {
      documentName: data.documentName,
      requestHeaders: data.requestHeaders,
      requestParameters: Object.fromEntries(data.requestParameters.entries()),
    })

    if (response.status !== 200 || !response.data) {
      throw new Error(response.statusText)
    }

    const document = ensureDocument(
      typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data,
    )

    if (
      isEmptyDocument(data.document) &&
      // with this parameter we can assume that the client already has the document
      // thus, we trust it and do not send it again
      data.requestParameters.get('initialized') !== '1'
    ) {
      logger.info(
        {
          hook: 'webhook-load',
          document_name: data.documentName,
          context: data.context,
        },
        `load ${data.documentName} from webhook`,
      )
      // Because we need to apply document and annotations in order, thus, here pass the whole document into transformer
      data.document.merge(this.configuration.transformer.toYdoc(document))
    }
  }
}

const FIELDS = ['title', 'blurb', 'default', 'annotations']

function isEmptyDocument(document) {
  return FIELDS.every((field) => document.isEmpty(field))
}
