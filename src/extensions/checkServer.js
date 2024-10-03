const { parseJSON } = require('../utils/parseJSON.js')

exports.CheckServer = class CheckServer {
  onStateless({ payload, connection }) {
    parseJSON(payload, 'checkServer', () => connection.sendStateless(payload))
  }
}
