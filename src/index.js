const { Events } = require('@hocuspocus/extension-webhook')
const { StoripressWebhook } = require('./storipress-webhook.js')
const { CheckServer } = require('./extensions/checkServer.js')
const { StatelessSentry } = require('./extensions/statelessSentry')
const { Monitor } = require('@hocuspocus/extension-monitor')
const { Server } = require('@hocuspocus/server')
const { TiptapTransformer } = require('@hocuspocus/transformer')
const { SQLite } = require('@hocuspocus/extension-sqlite')
const { getSchema } = require('@tiptap/core')
const { ExtensionAPI } = require('@storipress/extension-api')
const {
  schemaExtensions: StoripressSchema,
} = require('@storipress/tiptap-schema')
const { Logger } = require('./extensions/Logger.js')

const { AnnotationTransformer } = require('./transformers/index.js')
const { UpdateLogger } = require('./extensions/UpdateLogger.js')
const { env } = require('./utils/env.js')

const transformer = new AnnotationTransformer(
  getSchema(StoripressSchema),
  TiptapTransformer.extensions(StoripressSchema),
)

console.log(`webhook endpoint: '${process.env.WEBHOOK_ENDPOINT}'`)

const DATABASE_PATH = 'databases/db.sqlite'

const server = Server.configure({
  port: 8001,
  timeout: 30000,
  extensions: [
    new Logger(),
    new UpdateLogger(),
    new CheckServer(),
    new StatelessSentry(),
    env.NODE_ENV !== 'test' &&
      new Monitor({
        enableDashboard: true,
        dashboardPath: 'dashboard',
        metricsInterval: 1000, // ms
        osMetricsInterval: 3000, // ms
        port: null,
        user: env.MONITOR_USER,
        password: env.MONITOR_PASSWORD,
      }),
    new SQLite({
      database: DATABASE_PATH,
    }),
    new StoripressWebhook({
      url: env.WEBHOOK_ENDPOINT,
      secret: env.WEBHOOK_SECRET,
      transformer,
      events: [Events.onConnect, Events.onCreate, Events.onChange],
      debounce: 5000,
      debounceMaxWait: 10000,
    }),
    new ExtensionAPI(DATABASE_PATH),
  ].filter(Boolean),
})

exports.server = server
