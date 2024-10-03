const { parseError } = require('../utils/parseJSON.js')
const Sentry = require('@sentry/node')

exports.StatelessSentry = class StatelessSentry {
  onStateless({ payload, documentName }) {
    parseError(payload, () => {
      Sentry.captureException(
        new Error('Server statelss parse error'),
        (scope) => {
          scope.setContext('response', { payload, documentName })
          return scope
        },
      )
    })
  }
}
