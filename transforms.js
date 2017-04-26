/**
 * Module dependencies
 */
const accounting = require('accounting')
const util = require('util')
const currency = require('currency-symbol-map')

/**
 * formatPrice - format currency code and price nicely
 * @param {Object} value
 * @returns {String} formatted price
 * @note Value is expected to be of the form:
 *   { 
 *     CurrencyCode: [ 'EUR' ],
 *     Amount: [ '130' ] // Cents
 *   }
 */
module.exports.formatPrice = function (val) {
  const code = val && val.CurrencyCode
  const amount = val && val.Amount
  let decimal
  let thousand

  if (!code || !amount) return null

  // Set separator
  if (~['DE'].indexOf(this.country)) {
    decimal = ','
    thousand = '.'
  } else {
    decimal = '.'
    thousand = ','
  }

  return accounting.formatMoney(amount / 100,
                                currency(code), 2, thousand, decimal)
}

module.exports.formatToNumber = function (val) {
  const amount = val && val.Amount
  if (!amount) return null
  return parseInt(amount)
}
