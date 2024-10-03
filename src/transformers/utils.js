exports.castArray = function castArray(x) {
  if (x == null) {
    return []
  }

  return Array.isArray(x) ? x : [x]
}

exports.transColumn = ['title', 'blurb']
exports.seoTextColumn = ['searchTitle', 'searchDescription', 'slug']
exports.seoMapColumn = ['tags', 'authors', 'feature']
