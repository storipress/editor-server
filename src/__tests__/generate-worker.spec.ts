import { generateResult } from '../generate-result'
import { it, expect } from 'vitest'

it('can generate html', async () => {
  expect(
    generateResult({
      documentName: 'client_id.article_id',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello',
              },
            ],
          },
        ],
      },
    }),
  ).toEqual({
    html: '<p data-sp-article-end="client_id.article_id" data-sp-article="client_id.article_id">Hello</p>',
    plaintext: 'Hello',
  })

  expect(
    generateResult({
      documentName: 'client_id.article_id',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Line 1',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Line 2',
              },
            ],
          },
        ],
      },
    }),
  ).toEqual({
    html: '<p data-sp-article="client_id.article_id">Line 1</p><p data-sp-article-end="client_id.article_id">Line 2</p>',
    plaintext: 'Line 1\n\nLine 2',
  })
})
