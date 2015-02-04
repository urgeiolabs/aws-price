#!/usr/bin/env node

/**
 * Module dependencies
 */
var amazon = require('./')
  , nomnom = require('nomnom');

var opts = nomnom
  .script('amazon-lookup')
  .option('id', {
    abbr: 'i',
    required: true,
    help: 'Amazon api key'
  })
  .option('secret', {
    abbr: 's',
    required: true,
    help: 'Api secret'
  })
  .option('associate', {
    abbr: 'a',
    help: 'Associate id'
  })
  .option('country', {
    abbr: 'c',
    help: 'Amazon country'
  })
  .option('price', {
    abbr: 'p',
    help: 'Price range'
  })
  .option('keywords', {
    abbr: 'k',
    required: true,
    help: 'Keywords to search'
  })
  .option('one', {
    abbr: '1',
    help: 'Only return one result',
    flag: true
  })
  .option('limit', {
    abbr: 'l',
    help: 'Limit number of results'
  })
  .option('page', {
    help: 'Choose page'
  })
  .parse();

amazon({keywords: opts.keywords})
  .id(opts.id)
  .secret(opts.secret)
  .associate(opts.associate || 'node-amazon-lookup')
  .country(opts.country)
  .price(opts.price)
  .page(opts.page)
  .one(opts.one)
  .limit(opts.limit)
  .done(function (err, result) {
    if (err) throw err;
    console.log(result);
  });
