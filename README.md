# aws-price

## Introduction

This module is a simple chainable wrapper around [node-apac](http://github.com/dmcquay/node-apac), primarily used for retrieving prices from amazon using a given ASIN identifier

## Dependencies

* [node-apac](https://github.com/dmcquay/node-apac)
* [jsonpath](https://github.com/dchester/jsonpath)
* [underscore](https://underscorejs.org)

## Example

    var price = require('aws-price');

    price('<asin>')
      .id('<aws id>')
      .secret('<aws secret>')
      .associate('<amazon associate id>')
      .country('us')
      .done(function (err, res) {});

It is also possible to look for products via keywords or EAN

    price({ keywords: 'Teddy Bear' })
    ...

    // Up to 10 EANs
    price({ ean: '0123456789123,1234567890123' })
    ...
