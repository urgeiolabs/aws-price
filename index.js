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
      var error = extractError(res);

      // Process errors
      if (error) return cb(new Error(error));

      // Extract interesting stuff
      var result = extract.call(that, res, that.extractions);

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

var first = function (obj, query) {
  var matches = path(obj, query);
  return matches.length ? matches[0] : null;
};

var extractError = function (obj) {
  return first(obj, '$..Error.Message[0]');
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

var extract = function (text, extractions) {
  var that = this;

  var res = _
    .chain(extractions)
    .map(function (x) {
      var key = x.name
        , val = first(text, x.query);

      // Transform value if we have a transform available
      if (x.transform) val = x.transform.call(that, val);

      return [key, val];
    })
    .filter(function (x) {
      return x[1] !== null;
    })
    .object()
    .value();

  return _.keys(res).length ? res : null;
};

var defaultExtractions = [
  { name: 'id', query: '$..ASIN[0]' },
  { name: 'listPrice',
    query: '$..ListPrice..Price[0]',
    transform: transforms.formatPrice
  },
  { name: 'name', query: '$..Title[0]' },
  { name: 'offerPrice',
    query: '$..Offer..Price[0]',
    transform: transforms.formatPrice
  },
  { name: 'url', query: '$..DetailPageURL[0]' }
];
