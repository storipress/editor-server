// These functions are copy from https://github.com/yjs/y-prosemirror/blob/master/src/plugins/sync-plugin.js
// It is using for rendering Yjs document into ProseMirror document
// We need these because we need to get the `mapping` (the relationship of between each ProseMirror node and Yjs node) to calculate position
const Y = require('yjs')

/**
 * @param {string} s
 * @return {Error}
 */
/* istanbul ignore next */
const create = (s) => new Error(s)

/**
 * @throws {Error}
 * @return {never}
 */
/* istanbul ignore next */
const methodUnimplemented = () => {
  throw create('Method unimplemented')
}

/**
 * @param {Y.Item} item
 * @param {Y.Snapshot} [snapshot]
 */
const isVisible = (item, snapshot) =>
  snapshot === undefined
    ? !item.deleted
    : snapshot.sv.has(item.id.client) &&
      /** @type {number} */ (snapshot.sv.get(item.id.client)) > item.id.clock &&
      !Y.isDeleted(snapshot.ds, item.id)

/**
 * @private
 * @param {Y.XmlElement | Y.XmlHook} el
 * @param {PModel.Schema} schema
 * @param {ProsemirrorMapping} mapping
 * @param {Y.Snapshot} [snapshot]
 * @param {Y.Snapshot} [prevSnapshot]
 * @param {function('removed' | 'added', Y.ID):any} [computeYChange]
 * @return {PModel.Node | null}
 */
const createNodeIfNotExists = (
  el,
  schema,
  mapping,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const node = /** @type {PModel.Node} */ (mapping.get(el))
  if (node === undefined) {
    if (el instanceof Y.XmlElement) {
      return createNodeFromYElement(
        el,
        schema,
        mapping,
        snapshot,
        prevSnapshot,
        computeYChange
      )
    } else {
      throw methodUnimplemented() // we are currently not handling hooks
    }
  }
  return node
}

/**
 * @private
 * @param {Y.XmlElement} el
 * @param {any} schema
 * @param {ProsemirrorMapping} mapping
 * @param {Y.Snapshot} [snapshot]
 * @param {Y.Snapshot} [prevSnapshot]
 * @param {function('removed' | 'added', Y.ID):any} [computeYChange]
 * @return {PModel.Node | null} Returns node if node could be created. Otherwise it deletes the yjs type and returns null
 */
const createNodeFromYElement = (
  el,
  schema,
  mapping,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const children = []
  const createChildren = (type) => {
    if (type.constructor === Y.XmlElement) {
      const n = createNodeIfNotExists(
        type,
        schema,
        mapping,
        snapshot,
        prevSnapshot,
        computeYChange
      )
      if (n !== null) {
        children.push(n)
      }
    } else {
      const ns = createTextNodesFromYText(
        type,
        schema,
        mapping,
        snapshot,
        prevSnapshot,
        computeYChange
      )
      if (ns !== null) {
        ns.forEach((textchild) => {
          if (textchild !== null) {
            children.push(textchild)
          }
        })
      }
    }
  }
  if (snapshot === undefined || prevSnapshot === undefined) {
    el.toArray().forEach(createChildren)
  } else {
    Y.typeListToArraySnapshot(
      el,
      new Y.Snapshot(prevSnapshot.ds, snapshot.sv)
    ).forEach(createChildren)
  }
  try {
    const attrs = el.getAttributes(snapshot)
    if (snapshot !== undefined) {
      if (!isVisible(/** @type {Y.Item} */ (el._item), snapshot)) {
        attrs.ychange = computeYChange
          ? computeYChange('removed', /** @type {Y.Item} */ (el._item).id)
          : { type: 'removed' }
      } else if (!isVisible(/** @type {Y.Item} */ (el._item), prevSnapshot)) {
        attrs.ychange = computeYChange
          ? computeYChange('added', /** @type {Y.Item} */ (el._item).id)
          : { type: 'added' }
      }
    }
    const node = schema.node(el.nodeName, attrs, children)
    mapping.set(el, node)
    return node
  } catch (e) {
    // an error occured while creating the node. This is probably a result of a concurrent action.
    mapping.delete(el)
    return null
  }
}

exports.createNodeFromYElement = createNodeFromYElement

/**
 * @private
 * @param {Y.XmlText} text
 * @param {any} schema
 * @param {ProsemirrorMapping} mapping
 * @param {Y.Snapshot} [snapshot]
 * @param {Y.Snapshot} [prevSnapshot]
 * @param {function('removed' | 'added', Y.ID):any} [computeYChange]
 * @return {Array<PModel.Node>|null}
 */
const createTextNodesFromYText = (
  text,
  schema,
  mapping,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const nodes = []
  const deltas = text.toDelta(snapshot, prevSnapshot, computeYChange)
  try {
    for (let i = 0; i < deltas.length; i++) {
      const delta = deltas[i]
      const marks = []
      for (const markName in delta.attributes) {
        marks.push(schema.mark(markName, delta.attributes[markName]))
      }
      nodes.push(schema.text(delta.insert, marks))
    }
  } catch (e) {
    // an error occured while creating the node. This is probably a result of a concurrent action.
    return null
  }
  // @ts-ignore
  return nodes
}
