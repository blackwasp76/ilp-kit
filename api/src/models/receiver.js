'use strict'

module.exports = ReceiverFactory

const _ = require('lodash')
const Model = require('five-bells-shared').Model
const PersistentModelMixin = require('five-bells-shared').PersistentModelMixin
const Database = require('../lib/db')
const Validator = require('five-bells-shared/lib/validator')
const Sequelize = require('sequelize')

ReceiverFactory.constitute = [Database, Validator]
function ReceiverFactory(sequelize, validator) {
  class Receiver extends Model {
    static convertFromExternal(data) {
      return data
    }

    static convertToExternal(data) {
      delete data.created_at
      delete data.updated_at

      return data
    }

    static convertFromPersistent(data) {
      data = _.omit(data, _.isNull)
      return data
    }

    static convertToPersistent(data) {
      return data
    }
  }

  Receiver.validateExternal = validator.create('Receiver')

  PersistentModelMixin(Receiver, sequelize, {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4
    },
    name: Sequelize.STRING,
    user: Sequelize.INTEGER,
    webhook: Sequelize.STRING
  })

  return Receiver
}
