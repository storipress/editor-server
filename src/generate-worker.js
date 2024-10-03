const workerpool = require('workerpool')
const { generateResult } = require('./generate-result')

workerpool.worker({
  generateResult,
})
