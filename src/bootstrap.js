const Sentry = require('@sentry/node')
const { env } = require('./utils/env')

require('@sentry/tracing')

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: process.env.NODE_ENV !== 'test',
  tracesSampleRate: 1.0,
})
