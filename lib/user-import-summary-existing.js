/**
 * Interface to the User model.
 */
var dslogger = require('./dslogger')
    ;

// Initialize logger.
dslogger.init('mb-logging-api-server', false);

/**
 * Constructor to the UserImportSummary object.
 *
 * @param model
 *   The model of the userImportSummary document.
 */
function UserImportSummaryExisting(model) {
  this.docModel = model;
}

/**
 * Update log document with supplied existing values
 *
 * @param req
 *  The request object in a POST callback.
 * @param res
 *  The response object in a POST callback.
 */
UserImportSummaryExisting.prototype.post = function(req, res) {
  this.request = req;
  this.response = res;
  var addExistingArgs = {};

  if (this.request.body.mailchimp !== undefined) {
    addExistingArgs.mailchimp = this.request.body.mailchimp;
  }
  if (this.request.body.drupal !== undefined) {
    addExistingArgs.drupal = this.request.body.drupal;
  }
  if (this.request.body.mobile_commons_undeliverable !== undefined) {
    addExistingArgs.mobile_commons = {
      "undeliverable" : this.request.body.mobile_commons_undeliverable
    }
  }
  if (this.request.body.mobile_commons_existing !== undefined) {
    addExistingArgs.mobile_commons = {
      "existing" : this.request.body.mobile_commons_existing
    }
  }
  if (this.request.body.mobile_commons_no_subscription !== undefined) {
    addExistingArgs.mobile_commons = {
      "no_subscription" : this.request.body.mobile_commons_no_subscription
    }
  }
  if (this.request.body.mobile_commons_other !== undefined) {
    addExistingArgs.mobile_commons = {
      "other" : this.request.body.mobile_commons_other
    }
  }
  if (this.request.body.total !== undefined) {
    addExistingArgs.mobile_commons = {
      "total" : this.request.body.mobile_commons_total
    }
  }
  if (this.request.body.total !== undefined) {
    addExistingArgs.total = this.request.body.total;
  }

  if (this.request.query.target_CSV_file !== undefined) {

    var logEntrySummaryExisting = new this.docModel(addExistingArgs);
    logEntrySummaryExisting.findOneAndUpdate(
      {target_CSV_file : this.request.query.target_CSV_file},
      {$push : {existing : addExistingArgs}},
      { },
      function(err, model) {
        if (err) {
          // console.log(err);
          res.send(500, err);
          dslogger.error(err);
        }
        // Update log entry with existing stats
        res.send(201, addExistingArgs);
        dslogger.log('findOneAndUpdate executed on: ' + this.request.query.target_CSV_file + '. Raw response from mongo:');
        dslogger.log(addExistingArgs);
        console.log("Updated existing summary log entry using UserImportSummaryExisting POST method.");
        return 1;
    });

  }

};

module.exports = UserImportSummaryExisting;
