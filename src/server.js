require('dotenv/config')
require('./bootstrap')
const { server } = require('./index.js')

server.listen()
