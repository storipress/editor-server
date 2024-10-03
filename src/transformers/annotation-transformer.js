const {
  relativePositionToAbsolutePosition,
  absolutePositionToRelativePosition,
} = require('y-prosemirror')
const Y = require('yjs')
const { createNodeFromYElement } = require('./prosemirror-binding.js')
const {
  castArray,
  transColumn,
  seoMapColumn,
  seoTextColumn,
} = require('./utils.js')
const { richInputExtensions } = require('@storipress/tiptap-schema')
const { logger } = require('../utils/logger.js')

exports.AnnotationTransformer = class AnnotationTransformer {
  constructor(schema, transformer, documentMap = { annotations: 'default' }) {
    this.schema = schema
    this.transformer = transformer
    this.documentMap = documentMap
  }

  /**
   *
   * @param {Y.Doc} doc
   * @param {string} fieldName
   * @returns
   */
  fromYdoc(doc, fieldName) {
    const result = {}
    for (const name of Object.values(this.documentMap)) {
      result[name] = this.transformer.fromYdoc(doc, name)
    }

    for (const name of transColumn) {
      result[name] = this.transformer.fromYdoc(doc, name)
    }

    for (const name of seoTextColumn) {
      result[name] = doc.getText(name).toJSON()
    }

    for (const name of seoMapColumn) {
      result[name] = doc.getMap(name).toJSON()[name]
    }

    if (typeof fieldName === 'string') {
      const map = doc.get(fieldName, Y.Map)
      result[fieldName] = serializeAnnotation(
        doc,
        map,
        doc.get(this.documentMap[fieldName], Y.XmlFragment),
        this.schema,
      )
      return result
    }
    fieldName = fieldName ? fieldName : Object.keys(this.documentMap)
    for (const field of fieldName) {
      result[field] = serializeAnnotation(
        doc,
        doc.get(field, Y.Map),
        doc.get(this.documentMap[field], Y.XmlFragment),
        this.schema,
      )
    }

    return result
  }

  /**
   * Convert a document to a YDoc
   * @param {*} doc
   * @param {string} fieldName
   * @param {*} fullDoc
   * @returns
   */
  toYdoc(doc, fieldName, fullDoc) {
    const ydoc = new Y.Doc()
    if (typeof fieldName === 'string') {
      if (!fullDoc) {
        const name = this.documentMap[fieldName]
        fullDoc = this.transformer.toYdoc(doc[name], name)

        const update = Y.encodeStateAsUpdate(fullDoc)
        Y.applyUpdate(ydoc, update)
      }

      const update = Y.encodeStateAsUpdate(
        deserializeAnnotation(
          doc,
          fieldName,
          fullDoc.get(this.documentMap[fieldName], Y.XmlFragment),
          this.schema,
        ),
      )
      Y.applyUpdate(ydoc, update)
      return ydoc
    }

    for (const name of Object.values(this.documentMap)) {
      const update = Y.encodeStateAsUpdate(
        this.transformer.toYdoc(doc[name], name),
      )
      Y.applyUpdate(ydoc, update)
    }

    for (const name of transColumn) {
      if (doc[name]) {
        const update = Y.encodeStateAsUpdate(
          this.transformer.toYdoc(doc[name], name, richInputExtensions),
        )
        Y.applyUpdate(ydoc, update)
      }
    }

    fieldName = castArray(fieldName)
    fieldName = fieldName.length > 0 ? fieldName : Object.keys(this.documentMap)
    for (const field of fieldName) {
      const update = Y.encodeStateAsUpdate(
        deserializeAnnotation(
          doc[field],
          field,
          ydoc.get(this.documentMap[field], Y.XmlFragment),
          this.schema,
        ),
      )
      Y.applyUpdate(ydoc, update)
    }
    return ydoc
  }
}

/**
 *
 * @param ydoc {Y.Doc}
 * @param map  {Y.Map}
 * @param document {Y.XmlFragment}
 * @param schema {import('prosemirror-model').Schema}
 */
function serializeAnnotation(ydoc, map, document, schema) {
  const result = {}
  const mapping = new Map()
  document
    .toArray()
    .forEach((el) => createNodeFromYElement(el, schema, mapping))
  // Here we are going to convert relative position to absolution position because relative position only meaningful when every clients have same picture of document
  // i.e. relative position will become meaningless when all of the editor sessions closed
  for (const [key, annotation] of map.entries()) {
    const from = relativePositionToAbsolutePosition(
      ydoc,
      document,
      annotation.from,
      mapping,
    )
    const to = relativePositionToAbsolutePosition(
      ydoc,
      document,
      annotation.to,
      mapping,
    )

    if (!from || !to) {
      // well ...
      logger.warn({ key, annotation, from, to }, '[ser] pos lost')
      continue
    }

    if (from === to) {
      // corrupt annotation
      logger.warn({ key, annotation, from, to }, '[ser] corrupt:')
      continue
    }

    result[key] = { ...annotation, from, to }
  }
  return result
}

/**
 * Deserialize annotations
 * @param {*} annotations
 * @param {string} field
 * @param {*} document
 * @param {import('prosemirror-model').Schema} schema
 * @returns
 */
function deserializeAnnotation(annotations, field, document, schema) {
  const ydoc = new Y.Doc()
  const mapping = new Map()
  document
    .toArray()
    .forEach((el) => createNodeFromYElement(el, schema, mapping))
  const map = ydoc.getMap(field)
  for (const [key, annotation] of Object.entries(annotations)) {
    // dispose old relative position
    if (
      typeof annotation.from === 'object' ||
      typeof annotation.to === 'object'
    ) {
      continue
    }

    const from = absolutePositionToRelativePosition(
      annotation.from,
      document,
      mapping,
    )
    const to = absolutePositionToRelativePosition(
      annotation.to,
      document,
      mapping,
    )

    if (!from || !to) {
      // well ...
      logger.warn({ key, annotation, from, to }, '[der] pos lost')
      continue
    }

    logger.info({ key, annotation, from, to }, '[der] load annotation')
    map.set(key, { ...annotation, from, to })
  }
  return ydoc
}
