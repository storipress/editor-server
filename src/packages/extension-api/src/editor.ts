import { Editor, JSONContent } from '@tiptap/core'
import { Collaboration } from '@tiptap/extension-collaboration'
import { schemaExtensions } from '@storipress/tiptap-schema'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { WebSocket } from 'ws'

const _resolve = require.resolve

// @ts-expect-error patch global
require.resolve = null

const { JSDOM } = require('jsdom')

require.resolve = _resolve

const { window } = new JSDOM()
const { document } = window

// set document to prevent setContent error

// @ts-expect-error patch global
global.document = document
// @ts-expect-error patch global
global.window = window
// @ts-expect-error patch global
global.navigator = window.navigator

export const INTERNAL_AUTH_PARAM = 'x-loopback-internal-auth'
export const INTERNAL_AUTH_VALUE =
  '<FILL A TOKEN_HERE>'

export function createProvider(documentName: string) {
  const provider = new HocuspocusProvider({
    url: 'ws://127.0.0.1:8001',
    name: documentName,
    WebSocketPolyfill: WebSocket,
    parameters: {
      [INTERNAL_AUTH_PARAM]: INTERNAL_AUTH_VALUE,
    },
  })
  return provider
}

export function createEditor(
  provider: HocuspocusProvider,
  field: string = 'default',
) {
  const editor = new Editor({
    extensions: [
      ...schemaExtensions,
      Collaboration.configure({ document: provider.document, field }),
    ],
  })
  return editor
}

export function writeField(
  provider: HocuspocusProvider,
  field: string,
  content: JSONContent,
) {
  const editor = createEditor(provider, field)
  editor.commands.setContent(content)
  editor.destroy()
}
