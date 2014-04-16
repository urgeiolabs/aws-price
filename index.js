/**
 * Module dependencies
 */
var apac = require('apac')
  , path = require('JSONPath').eval
  , transforms = require('./transforms')
  , _ = require('underscore');

var price = module.exports = function (itemId, opts) {
  return new Price(itemId, opts);
};

var Price = function Price (itemId, opts) {
  this.mode = 'lookup';

  if ('object' === typeof itemId) {
    if (itemId.id) this.itemId = itemId.id;
    if (itemId.keywords) this.keywords = itemId.keywords, this.mode = 'search';
  } else {
    this.itemId = itemId;
  }

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
  if (!country) return this;

  // Find matching endpoints
  var match = endpointMap.filter(function (e) {
    return e.code === country.toUpperCase() || e.name === country;
  });

  // Set the first matching endpoint
  if (match.length > 0) this.opts.endpoint = match[0].endpoint;
  return this;
};

Price.prototype.done = function (cb) {
  var that = this;

  var helper = new apac.OperationHelper({
    awsId: this.opts.amazonId,
    awsSecret: this.opts.amazonSecret,
    assocId: this.opts.associateId,
    endPoint: this.opts.endpoint
  });

  // Make sure we only execute the callback once
  cb = _.once(cb);


  // Convert op name
  var op = this.mode === 'search' ? 'ItemSearch' : 'ItemLookup';

  // Populate request object
  var req = {
    'ResponseGroup': 'Offers,ItemAttributes'
  };

  if (this.mode === 'search') {
    _.extend(req, { 'SearchIndex': 'All', 'Keywords': this.keywords });
  } else if (this.mode === 'lookup') {
    _.extend(req, { 'ItemId': this.itemId });
  }



  // Run the request
  helper.execute(op, req, success(cb), error(cb));

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

var endpointMap = [
  { name: 'canada', code: 'CA', endpoint: 'webservices.amazon.ca' },
  { name: 'china', code: 'CN', endpoint: 'webservices.amazon.cn' },
  { name: 'germany', code: 'DE', endpoint: 'webservices.amazon.de' },
  { name: 'spain', code: 'ES', endpoint: 'webservices.amazon.es' },
  { name: 'france', code: 'FR', endpoint: 'webservices.amazon.fr' },
  { name: 'italy', code: 'IT', endpoint: 'webservices.amazon.it' },
  { name: 'japan', code: 'JP', endpoint: 'webservices.amazon.jp' },
  { name: 'uk', code: 'GB', endpoint: 'webservices.amazon.co.uk' },
  { name: 'us', code: 'US', endpoint: 'webservices.amazon.com' },
  { name: 'india', code: 'IN', endpoint: 'webservices.amazon.in' }
];

var defaultExtractions = {
  'asin': '$..ASIN',
  'listPrice': '$..ListPrice.FormattedPrice',
  'name': '$..Title',
  'offerPrice': '$..Offer..Price.FormattedPrice',
  'url': '$..DetailPageURL'
};
