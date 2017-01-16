"use strict"

// For development
// TODO get rid of this
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = WebfingerControllerFactory

const request = require('five-bells-shared/utils/request')
const Log = require('../lib/log')
const Config = require('../lib/config')
const Ledger = require('../lib/ledger')
const UserFactory = require('../models/user')
const ReceiverFactory = require('../models/receiver')

const NotFoundError = require('../errors/not-found-error')

WebfingerControllerFactory.constitute = [Log, Config, Ledger, UserFactory, ReceiverFactory]
function WebfingerControllerFactory(log, config, ledger, User, Receiver) {
  log = log('auth')

  return class WebfingerController {
    static init(router) {
      router.get('/webfinger', this.load)
    }

    /**
     * @api {GET} /webfinger Get webfinger info
     * @apiName GetWebfinger
     * @apiGroup Misc
     * @apiVersion 1.0.0
     *
     * @apiDescription Get webfinger info
     *
     * @apiExample {shell} Get webfinger info
     *    curl -X GET
     *    https://wallet.example/webfinger?resource=acct:alice@wallet.example
     *
     * @apiSuccessExample {json} 200 Response:
     *    HTTP/1.1 200 OK
     *    {
     *      "subject": "acct:alice@wallet.example",
     *      "links": [
     *        {
     *          "rel": "https://interledger.org/rel/ledgerUri",
     *          "href": "https://wallet.example/ledger"
     *        },
     *        {
     *          "rel": "https://interledger.org/rel/socketIOUri",
     *          "href": "https://wallet.example/socket.io"
     *        },
     *        {
     *          "rel": "https://interledger.org/rel/sender/payment",
     *          "href": "https://wallet.example/payments"
     *        },
     *        {
     *          "rel": "https://interledger.org/rel/sender/quote",
     *          "href": "https://wallet.example/payments/quote"
     *        },
     *        {
     *          "rel": "https://interledger.org/rel/receiver",
     *          "href": "https://wallet.example/receivers/alice"
     *        }
     *      ]
     *    }
     */
    static * load() {
      if (!this.query || !this.query.resource) {
        // TODO throw exception
        return this.status = 400
      }

      const resource = this.query.resource

      if (resource.slice(0, 5) === 'acct:') {
        const splitResource = resource.slice(5).split('@')
        if (splitResource.length !== 2) {
          throw new NotFoundError('acct: URIs must contain exactly one @-symbol')
        }

        const [username, hostname] = splitResource

        if (hostname !== config.data.get('client_host')) {
          throw new NotFoundError('Client asked about a user on another server, we are: ' +
            config.data.get('client_host'))
        }

        const splitUsername = username.split(/[ +]/)
        if (splitUsername.length === 1) {
          this.body = yield getWebfingerForUser(username)
        } else if (splitUsername.length === 2) {
          this.body = yield getWebfingerForReceiver(splitUsername[0], splitUsername[1])
        } else {
          throw new NotFoundError('Username must contain zero or one plus signs or spaces')
        }
      } else if (resource.slice(0, 6) === 'https:') {
        // Host lookup
        if (resource === config.data.get('client_uri')) {
          this.body = {
            'subject': config.data.get('client_uri'),
            'properties': {
              'https://interledger.org/rel/publicKey': config.data.getIn(['connector', 'public_key'])
            },
            'links': [
              {
                'rel': 'https://interledger.org/rel/ledgerUri',
                'href': config.data.getIn(['ledger', 'public_uri'])
              },
              {
                'rel': 'https://interledger.org/rel/peersRpcUri',
                'href': config.data.getIn(['server', 'base_uri']) + '/peers/rpc'
              }
            ]
          }
        }
        const ledgerUri = config.data.getIn(['ledger', 'public_uri'])
        const ledgerAccountsUri = ledgerUri + '/accounts/'
        if (resource.slice(0, ledgerAccountsUri.length) === ledgerAccountsUri) {
          const username = resource.match(/([^\/]*)\/*$/)[1]
          this.body = yield getWebfingerForUser(username)
        } else {
          throw new NotFoundError('Unrecognized resource URI, should start with: ' +
            ledgerAccountsUri)
        }
      } else {
        throw new NotFoundError('Unknown protocol')
      }

      // Account lookup
      function * getWebfingerForUser(username) {
        // Validate the user account
        const dbUser = yield User.findOne({ where: { username } })

        if (!dbUser) {
          throw new NotFoundError('Username not found')
        }

        return {
          'subject': 'acct:' + dbUser.username + '@' + config.data.get('client_host'),
          'links': [
            {
              // TODO decide on rel names
              'rel': 'https://interledger.org/rel/ledgerUri',
              'href': config.data.getIn(['ledger', 'public_uri'])
            },
            {
              // TODO an actual rel to the docs
              'rel': 'https://interledger.org/rel/socketIOUri',
              'href': config.data.getIn(['server', 'base_uri']) + '/socket.io'
            },
            {
              'rel': 'https://interledger.org/rel/ilpAddress',
              'href': config.data.getIn(['ledger', 'prefix']) + dbUser.username
            },
            {
              'rel': 'https://interledger.org/rel/sender/payment',
              'href': config.data.getIn(['server', 'base_uri']) + '/payments'
            },
            {
              'rel': 'https://interledger.org/rel/sender/quote',
              'href': config.data.getIn(['server', 'base_uri']) + '/payments/quote'
            },
            {
              'rel': 'https://interledger.org/rel/receiver',
              'href': config.data.getIn(['server', 'base_uri']) + '/receivers/' + dbUser.username
            }
          ]
        }
      }


      // Receiver lookup
      function * getWebfingerForReceiver(username, receivername) {
        const dbUser = yield User.findOne({ where: { username } })
        if (!dbUser) {
          throw new NotFoundError('Username not found')
        }

        const receiver = yield Receiver.findOne({ where: {
          user: dbUser.id, name: receivername
        } })

        console.log('receiver', receiver)
        return {
          'subject': 'acct:' + dbUser.username + '+' + receiver.name +
            '@' + config.data.get('client_host'),
          'links': [
            {
              // TODO decide on rel names
              'rel': 'https://interledger.org/rel/ledgerUri',
              'href': config.data.getIn(['ledger', 'public_uri'])
            },
            {
              // TODO an actual rel to the docs
              'rel': 'https://interledger.org/rel/socketIOUri',
              'href': config.data.getIn(['server', 'base_uri']) + '/socket.io'
            },
            {
              'rel': 'https://interledger.org/rel/ilpAddress',
              'href': config.data.getIn(['ledger', 'prefix']) + dbUser.username +
                '.~recv.' + receiver.name
            },
            {
              'rel': 'https://interledger.org/rel/sender/payment',
              'href': config.data.getIn(['server', 'base_uri']) + '/payments'
            },
            {
              'rel': 'https://interledger.org/rel/sender/quote',
              'href': config.data.getIn(['server', 'base_uri']) + '/payments/quote'
            },
            {
              'rel': 'https://interledger.org/rel/receiver',
              'href': config.data.getIn(['server', 'base_uri']) + '/receivers/' +
                dbUser.username + '/' + receiver.name
            }
          ]
        }
      }
    }
  }
}
