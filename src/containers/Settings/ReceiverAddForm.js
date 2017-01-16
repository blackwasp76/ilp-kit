import React, {Component, PropTypes} from 'react'
import { reduxForm } from 'redux-form'

import { add } from 'redux/actions/receiver'

import receiverValidation from './ReceiverValidation'

import { successable } from 'decorators'
import { resetFormOnSuccess } from 'decorators'

import Alert from 'react-bootstrap/lib/Alert'

import Input from 'components/Input/Input'

@reduxForm({
  form: 'receiverAdd',
  fields: ['name', 'webhook'],
  validate: receiverValidation
}, null, { add })
@successable()
@resetFormOnSuccess('receiverAdd')
export default class PeerAddForm extends Component {
  static propTypes = {
    add: PropTypes.func,

    // Form
    fields: PropTypes.object.isRequired,
    invalid: PropTypes.bool.isRequired,
    pristine: PropTypes.bool.isRequired,
    submitting: PropTypes.bool.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    values: PropTypes.object,
    initializeForm: PropTypes.func,
    resetData: PropTypes.func,

    // Successable
    permSuccess: PropTypes.func,
    tempSuccess: PropTypes.func,
    success: PropTypes.bool,
    permFail: PropTypes.func,
    tempFail: PropTypes.func,
    fail: PropTypes.any,
    reset: PropTypes.func
  }

  handleSubmit = (data) => {
    return this.props.add(data).then(() => {
      this.props.tempSuccess()
      this.props.resetData()
    })
  }

  render() {
    const { invalid, handleSubmit, submitting, success, fail, fields: { name, webhook } } = this.props

    return (
      <div>
        {success &&
        <Alert bsStyle="success">
          Receiver has been added!
        </Alert>}

        {fail && fail.id &&
        <Alert bsStyle="danger">
          Something went wrong
        </Alert>}

        <form onSubmit={handleSubmit(this.handleSubmit)}>
          <div className="form-group">
            <Input object={name} label="Name" size="lg" focus />
            <Input object={webhook} label="Webhook URL (HTTPS only)" size="lg" />
          </div>

          <div className="row">
            <div className="col-sm-5">
              <button type="submit" className="btn btn-complete btn-block"
                      disabled={invalid || submitting}>
                {submitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }
}
