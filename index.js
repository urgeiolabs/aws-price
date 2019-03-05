/**
 * Module dependencies
 */
const apac = require('apac')
const jp = require('jsonpath')
const transforms = require('./transforms')
const _ = require('underscore')

const price = module.exports = function (itemId, opts) {
  return new Price(itemId, opts)
}

const Price = function Price (itemId, opts) {
  this.mode = 'lookup'

  if ('object' === typeof itemId) {
    if (itemId.id) this.itemId = itemId.id
    if (itemId.ean) this.ean = itemId.ean
    if (itemId.keywords) this.keywords = itemId.keywords, this.mode = 'search'
  } else {
    this.itemId = itemId
  }

  this.opts = opts || {}
  this.extractions = defaultExtractions
}

Price.prototype.creds = function (creds) {
  _.extend(this.opts, {
    amazonId: creds.id,
    amazonSecret: creds.secret,
    associateId: creds.associateId
  })

  return this
}

Price.prototype.id = function (id) {
  this.opts.amazonId = id
  return this
}

Price.prototype.secret = function (secret) {
  this.opts.amazonSecret = secret
  return this
}

Price.prototype.associate = function (associateId) {
  this.opts.associateId = associateId
  return this
}

Price.prototype.loadImages = function (loadImages) {
  this.opts.loadImages = loadImages
  return this
}

Price.prototype.country = function (country) {
  if (!country) return this

  // Find matching endpoints
  const match = endpointMap.filter(e =>
    e.code === country.toUpperCase() || e.name === country
  )

  // Set country
  this.country = country

  // Set the first matching endpoint
  if (match.length > 0) this.opts.endpoint = match[0].endpoint
  return this
}

Price.prototype.price = function (price) {
  if (_.isString(price)) {
    price = price.split('..')
  } else if (!_.isArray(price)) {
    return this
  }

  if (price[0]) this.opts.minimumPrice = price[0] * 100
  if (price[1]) this.opts.maximumPrice = price[1] * 100

  return this
}

Price.prototype.limit = function (limit) {
  return this._limit = limit, this
}

Price.prototype.page = function (page) {
  this.opts.page = page
  return this
}

Price.prototype.browseNode = function (browseNode) {
  if (browseNode) this.opts.browseNode = browseNode
  return this
}

Price.prototype.searchIndex = function (searchIndex) {
  if (searchIndex) this.opts.searchIndex = searchIndex
  return this
}

Price.prototype.one = function (one) {
  return this._one = !arguments.length ? true : !!one, this
}

Price.prototype.done = function (cb) {
  const that = this

  const helper = new apac.OperationHelper({
    awsId: this.opts.amazonId,
    awsSecret: this.opts.amazonSecret,
    assocId: this.opts.associateId,
    endPoint: this.opts.endpoint
  })

  // Make sure we only execute the callback once
  cb = _.once(cb)

  // Convert op name
  const op = this.mode === 'search' ? 'ItemSearch' : 'ItemLookup'

  // Populate request object
  const req = {
    'ResponseGroup': 'Offers,ItemAttributes,Images'
  }

  let searchIndex = this.opts.searchIndex || 'All'

  if (this.opts.minimumPrice) req['MinimumPrice'] = this.opts.minimumPrice
  if (this.opts.maximumPrice) req['MaximumPrice'] = this.opts.maximumPrice
  if (this.opts.page) req['ItemPage'] = this.opts.page
  if (this.opts.browseNode) req['BrowseNode'] = this.opts.browseNode

  if (this.mode === 'search') {
    _.extend(req, { 'SearchIndex': searchIndex, 'Keywords': this.keywords })
  } else if (this.mode === 'lookup') {
    if (this.ean) {
      _.extend(req, {
        'ItemId': this.ean, 'IdType': 'EAN', 'SearchIndex': searchIndex
      })
    } else {
      _.extend(req, { 'ItemId': this.itemId })
    }
  }

  // Run the request
  helper.execute(op, req)
    .then(res => {
      success(res, cb)
    })
    .catch(err => {
      error(err, cb)
    })

  function success (res, cb) {
    const error = extractError(res)

    // Process errors
    if (error) return cb(new Error(error))

    // Find the item root
    let root = first(res, '$..Item')
    if (root && !Array.isArray(root)) root = [root]

    if (that.opts.loadImages) {
      that.extractions.push({ name: 'images', query: 'ImageSets..ImageSet' })
    }

    // Extract interesting stuff
    const result = root
          ? root.map(function (x) {
              return extract.call(that, x, that.extractions)
            })
          : []

    // format images
    if (that.opts.loadImages) {
      result.forEach(r => {
        // Remove images key if we didn't get any
        if (!r.images) {
          delete r.images
          return
        }

        let rawImages = r.images
        if (!Array.isArray(rawImages)) rawImages = [rawImages]
        r.images = rawImages.reduce((images, image) => {
          const { TinyImage, LargeImage, HiResImage } = image
          if (!TinyImage || !LargeImage || !HiResImage) return images
          const img = {
            small: TinyImage.URL,
            big: LargeImage.URL,
            hiRes: HiResImage.URL,
          }
          images.push(img)
          return images
        }, [])
      })
    }

    // Apply limits
    if (that._limit) {
      result = _.first(result, that._limit)
    }

    if (that._one) {
      result = _.first(result)
    }

    return cb(null, result)
  }

  function error (err, cb) {
    return cb(error)
  }

  return this
}

const first = function (obj, query, key) {
  if (!obj || typeof obj !== 'object') return null
  const matches = jp.query(obj, query)

  return matches.length ? matches[0] : null
}

const extractError = obj => first(obj, '$..Error..Message')

const endpointMap = [
  { name: 'canada', code: 'CA', endpoint: 'webservices.amazon.ca' },
  { name: 'china', code: 'CN', endpoint: 'webservices.amazon.cn' },
  { name: 'germany', code: 'DE', endpoint: 'webservices.amazon.de' },
  { name: 'spain', code: 'ES', endpoint: 'webservices.amazon.es' },
  { name: 'france', code: 'FR', endpoint: 'webservices.amazon.fr' },
  { name: 'italy', code: 'IT', endpoint: 'webservices.amazon.it' },
  { name: 'japan', code: 'JP', endpoint: 'webservices.amazon.co.jp' },
  { name: 'uk', code: 'GB', endpoint: 'webservices.amazon.co.uk' },
  { name: 'us', code: 'US', endpoint: 'webservices.amazon.com' },
  { name: 'india', code: 'IN', endpoint: 'webservices.amazon.in' }
]

const extract = function (text, extractions) {
  const res = _
    .chain(extractions)
    .map(x => {
      const key = x.name
      let val = first(text, x.query, x.name)

      // Transform value if we have a transform available
      if (x.transform) val = x.transform.call(this, val)

      return [key, val]
    })
    .filter(x => x[1] !== null)
    .object()
    .value()

  return _.keys(res).length ? res : null
}

const defaultExtractions = [
  { name: 'id', query: 'ASIN' },
  { name: 'listPrice',
    query: 'ItemAttributes..ListPrice',
    transform: transforms.formatPrice
  },
  { name: 'name', query: 'ItemAttributes..Title' },
  { name: 'offerPrice',
    query: 'Offers..Offer..Price',
    transform: transforms.formatPrice
  },
  { name: 'lowestPrice',
    query: 'OfferSummary..LowestNewPrice',
    transform: transforms.formatPrice
  },
  { name: 'lowestPriceSortable',
    query: 'OfferSummary..LowestNewPrice',
    transform: transforms.formatToNumber
  },
  { name: 'url', query: 'DetailPageURL' },
  { name: 'remaining', query: 'OfferSummary..TotalNew' },
  { name: 'image', query: 'LargeImage..URL' }
]
