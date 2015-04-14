module.exports = function langFilter(shop) {
  return shop.i18n.languages && shop.i18n.languages.length > 1
}