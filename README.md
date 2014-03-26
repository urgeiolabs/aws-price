# amz-price

## Introduction

This module is a simple chainable wrapper around [node-apac](http://github.com/dmcquay/node-apac), primarily used for retrieving prices from amazon using a given ASIN identifier

## Dependencies

* [node-apac](http://github.com/dmcquay/node-apac)
* [JSONPath](http://github.com/s3u/JSONPath)
* [underscore](http://underscorejs.org)

## Example

    var price = require('amz-price');

    price('<asin>')
      .id('<aws id>')
      .secret('<aws secret>')
      .associate('<amazon associate id>')
      .country('us')
      .done(function (err, res) {});
