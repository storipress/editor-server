const process = require('process')
const { z } = require('zod')
const { createEnv } = require('@t3-oss/env-core')

module.exports.env = createEnv({
  server: {
    NODE_ENV: z.string().optional(),
    WEBHOOK_ENDPOINT: z.string().url(),
    WEBHOOK_SECRET: z.string(),
    MONITOR_USER: z.string(),
    MONITOR_PASSWORD: z.string(),
    AXIOM_TOKEN: z.string(),
    SENTRY_DSN: z.string().default(''),
  },
  runtimeEnv: process.env,
})
