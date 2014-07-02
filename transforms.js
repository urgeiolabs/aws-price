/**
 * Module dependencies
 */
var accounting = require('accounting')
  , util = require('util')
  , currency = require('currency-symbol-map');

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
  var code = val && val.CurrencyCode && val.CurrencyCode[0]
    , amount = val && val.Amount && val.Amount[0]
    , decimal, thousand;

  if (!code || !amount) return null;

  // Set separator
  if (~['DE'].indexOf(this.country)) {
    decimal = ',';
    thousand = '.';
  } else {
    decimal = '.';
    thousand = ',';
  }

  return accounting.formatMoney(amount / 100, currency(code), 2, thousand, decimal);
};
