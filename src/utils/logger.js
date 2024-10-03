const pino = require('pino')
const { env } = require('./env.js')

exports.logger = pino(
  {
    level: 'debug',
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  },
  pino.transport({
    targets: [
      {
        level: 'debug',
        target: '@axiomhq/pino',
        options: {
          dataset: 'editor_server',
          token: env.AXIOM_TOKEN,
        },
      },
      {
        target: 'pino/file',
        options: { destination: 1, append: false },
      },
    ],
  }),
)
