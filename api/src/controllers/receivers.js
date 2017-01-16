'use strict'

module.exports = ReceiversControllerFactory

const forEach = require('co-foreach')
const Auth = require('../lib/auth')
const Log = require('../lib/log')
const Config = require('../lib/config')
const Connector = require('../lib/connector')
const ReceiverFactory = require('../models/receiver')

const NotFoundError = require('../errors/not-found-error')
const InvalidBodyError = require('../errors/invalid-body-error')

ReceiversControllerFactory.constitute = [Auth, Config, Log, ReceiverFactory, Connector]
function ReceiversControllerFactory(auth, config, log, Receiver, connector) {
  log = log('receivers')

  return class ReceiversController {
    static init(router) {
      router.get('/receivers', auth.checkAuth, this.getAll)
      router.post('/receivers', auth.checkAuth, this.postResource)
      router.put('/receivers/:name', auth.checkAuth, this.putResource)
      router.delete('/receivers/:name', auth.checkAuth, this.deleteResource)
    }

    static * getAll() {
      const user = this.req.user
      // TODO pagination
      const receivers = yield Receiver.findAll({
        where: { user: user.id },
        order: [['created_at', 'DESC']]
      })

      this.body = receivers
    }

    static * postResource() {
      const user = this.req.user
      const name = this.body.name
      const receiver = new Receiver()

      if (!name) throw new InvalidBodyError('Name is required for new receivers')

      receiver.user = user.id
      receiver.name = name
      receiver.webhook = this.body.webhook

      yield receiver.save()

      this.body = receiver
    }

    static * putResource() {
      const user = this.req.user
      const name = this.params.name
      let receiver = yield Receiver.findOne({ where: { user: user.id, name } })
      const webhook = this.body.webhook

      if (!receiver) throw new NotFoundError("Receiver doesn't exist")

      // Update in the db
      receiver.name = name
      receiver.webhook = webhook
      receiver = Receiver.fromDatabaseModel(yield receiver.save())

      this.body = receiver
    }

    static * deleteResource() {
      const user = this.req.user
      const name = this.params.name
      const receiver = yield Receiver.findOne({ where: { user: user.id, name } })

      if (!receiver) throw new NotFoundError("Receiver doesn't exist")

      yield receiver.destroy()

      this.body = this.params
    }
  }
}
