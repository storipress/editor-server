const {
  schemaExtensions,
  renderWithMark,
} = require('@storipress/tiptap-schema')
const { generateText } = require('@tiptap/core')
const { JSDOM } = require('jsdom')
const { window } = new JSDOM()
const { document } = window

// set window and document to prevent generateText and generateHTML error
global.window = window
global.document = document

/**
 * Generate html for document content
 * @param {{ content: import('@tiptap/core').JSONContent; documentName: string }} input
 * @returns
 */
const generateResult = (input) => {
  const [clientId, articleId] = input.documentName.split('.')
  const html = renderWithMark(input.content, { articleId, clientId })
  const plaintext = generateText(input.content, schemaExtensions)
  return {
    html,
    plaintext,
  }
}

exports.generateResult = generateResult
