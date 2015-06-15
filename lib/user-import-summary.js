/**
 * Interface to the User model.
 */
var dslogger = require('./dslogger'),
    util = require('util')
    ;

// Initialize logger.
dslogger.init('mb-logging-api-server', false);

/**
 * Constructor to the UserImportSummary object.
 *
 * @param model
 *   The model of the userImportSummary document.
 */
function UserImportSummary(model) {
  this.docModel = model;
}

/**
 * Converts a timestamp in seconds to a Date object.
 *
 * @param timestamp
 *   Timestamp in seconds.
 */
var convertToDate = function(timestamp) {
  return new Date(timestamp * 1000);
};

/**
 * Create a log document from the supplied values
 *
 * @param req
 *  The request object in a POST callback.
 * @param res
 *  The response object in a POST callback.
 */
UserImportSummary.prototype.post = function(req, res) {
  this.request = req;
  this.response = res;
  var addArgs = {};

  if (this.request.body.logging_timestamp !== undefined) {
    // Convert timestamp string to Date object
    var timestamp = parseInt(this.request.body.logging_timestamp);
    addArgs.logged_date = convertToDate(timestamp);
  }
  if (this.request.body.target_CSV_file !== undefined) {
    addArgs.target_CSV_file = this.request.body.target_CSV_file;
  }
  if (this.request.body.signup_count !== undefined) {
    addArgs.signup_count = this.request.body.signup_count;
  }
  if (this.request.body.skipped !== undefined) {
    addArgs.skipped = this.request.body.skipped;
  }
  if (this.request.query.source !== undefined) {
    addArgs.source = this.request.query.source;
  }
  if (this.request.query.type !== undefined) {
    addArgs.log_type = this.request.query.type;
  }

  var logEntry = new this.docModel(addArgs);
  logEntry.save(function(err) {
    if (err) {
      res.send(500, err);
      dslogger.error(err);
      console.log("ERROR - UserImportSummary.prototype.post: " + util.inspect(err, false, null));
    }
    // Added log entry to db
    var fullAddArgs = util.inspect(addArgs, false, null)
    res.send(201, addArgs);
    dslogger.log('Save executed on: ' + fullAddArgs + '. Raw response from mongo:');
    dslogger.log(fullAddArgs);
    return 1;
  });
};

/**
 * Retrieve summary log documents. Example request:
 * /api/v1/imports/summary/2014-09-01/2014-10-01?type=user&exists=1&source=niche.com
 *
 * @param req
 *   The request object in the GET callback.
 * @param res
 *   The response object in the GET callback.
 */
UserImportSummary.prototype.get = function(req, res) {

  if (req.param("start_date") == 0) {
    var targetStartDate = new Date('2014-08-01').toISOString();
  }
  else {
    var targetStartDate = new Date(req.param("start_date")).toISOString();
  }
  if (req.param("end_date") == 0) {
    var targetEndDate = new Date().toISOString();
  }
  else {
    var targetEndDate = new Date(req.param("end_date")).toISOString();
  }

  var data = {
    request: req,
    response: res
  };
  this.docModel.find( {
    $and : [
      { 'logged_date' : {$gte : targetStartDate, $lte : targetEndDate} },
      { 'source' : req.query.source }
    ]},
    function (err, docs) {
      if (err) {
        data.response.send(500, err);
        dslogger.error(err);
        return 0;
      }

      // Send results
      data.response.send(201, docs);
      console.log('Summary query returned.');
      return 1;
  }).sort({ target_CSV_file : 1 })
};

module.exports = UserImportSummary;
