/**
 * Module dependencies
 */
var apac = require('apac')
  , path = require('jsonpath').eval
  , _ = require('underscore');

var price = module.exports = function (itemId, opts) {
  return new Price(itemId, opts);
};

var Price = function Price (itemId, opts) {
  this.itemId = itemId;
  this.opts = opts || {};
  this.extractions = defaultExtractions;
};

Price.prototype.creds = function (creds) {
  _.extend(this.opts, {
    amazonId: creds.id,
    amazonSecret: creds.secret,
    associateId: creds.associateId
  });

  return this;
};

Price.prototype.id = function (id) {
  this.opts.amazonId = id;
  return this;
};

Price.prototype.secret = function (secret) {
  this.opts.amazonSecret = secret;
  return this;
};

Price.prototype.associate = function (associateId) {
  this.opts.associateId = associateId;
  return this;
};

Price.prototype.country = function (country) {
  if (endpointMap[country]) this.opts.endpoint = country;
  return this;
};

Price.prototype.extractions = function (exts) {
  this.extractions = exts;
  return this;
};

Price.prototype.extract = function (rename, path) {
  this.extractions[rename] = path;
  return this;
};

Price.prototype.done = function (cb) {
  var that = this;

  var helper = new apac.OperationHelper({
    awsId: this.opts.amazonId,
    awsSecret: this.opts.amazonSecret,
    assocId: this.opts.associateId,
    endpoint: this.opts.endpoint
  });

  cb = _.once(cb);

  helper.execute('ItemLookup', {
    'ResponseGroup': 'Offers,ItemAttributes',
    'ItemId': this.itemId
  }, success(cb), error(cb));

  function success (cb) {
    return function (res) {
      var flat = flattenArrays(res)
        , error = extractError(flat);

      // Process errors
      if (error) return cb(new Error(error));

      // Extract interesting stuff
      var result = extract(flat, that.extractions);

      return cb(null, result);
    }
  }

  function error (cb) {
    return function (error) {
      return cb(error);
    }
  }

  return this;
};

var flattenArrays = function (obj) {
  return _.chain(obj).pairs().map(function (x) {
    var key = x[0]
      , value = x[1];

    // Flatten array
    if (_.isArray(value)) {
      value = value[0];
    }

    // Recursively flatten objects
    if (value && 'object' === typeof value) {
      value = flattenArrays(value);
    }

    return [key, value];

  }).object().value();
};


var firstMatch = function (obj, query) {
  var matches = path(obj, query);
  return matches.length ? matches[0] : null;
};

var extract = function (obj, extractions) {
  var o = {};

  return _.pairs(extractions).map(function (x) {
    var o = {}, match = firstMatch(obj, x[1]);
    if (match) o[x[0]] = match;
    return o;
  }).reduce(function (memo, next) {
    return _.extend(memo, next);
  }, {});
};

var extractError = function (obj) {
  return firstMatch(obj, '$..Error.Message');
};

var endpointMap = {
  'canada': 'webservices.amazon.ca',
  'china': 'webservices.amazon.cn',
  'germany': 'webservices.amazon.de',
  'spain': 'webservices.amazon.es',
  'france': 'webservices.amazon.fr',
  'italy': 'webservices.amazon.it',
  'japan': 'webservices.amazon.jp',
  'uk': 'webservices.amazon.uk',
  'us': 'webservices.amazon.us',
};

var defaultExtractions = {
  'asin': '$..ASIN',
  'listPrice': '$..ListPrice.FormattedPrice',
  'name': '$..Title',
  'offerPrice': '$..Offer..Price.FormattedPrice',
  'url': '$..DetailPageURL'
};
