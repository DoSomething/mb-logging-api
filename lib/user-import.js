/**
 * Interface to the User model.
 */

/**
 * Constructor to the Log object.
 *
 * @param model
 *   The model of the log document.
 */
function UserImport(model) {
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
UserImport.prototype.post = function(req, res) {
  this.request = req;
  this.response = res;
  var addArgs = {};

  // Include parameter values in post
  addArgs.source = this.request.query.source;

  if (this.request.body.origin !== undefined) {
    var processedDate = convertToDate(parseInt(this.request.body.origin['processed_timestamp']));
    addArgs.origin = {
      "processed" : processedDate,
      "name" : this.request.body.origin['name'],
    }
  }

  if (this.request.body.phone !== undefined) {
    addArgs.phone = {
      "number" : this.request.body.phone,
      "status" : this.request.body.phone_status
    }
  }
  if (this.request.body.email !== undefined) {
    addArgs.email = {
      "address" : this.request.body.email,
      "status" : this.request.body.email_status
    }
    if (this.request.body.email_acquired_timestamp !== undefined) {
      var timestamp = parseInt(this.request.body.email_acquired_timestamp);
      addArgs.email.acquired = convertToDate(timestamp);
    }
  }
  if (this.request.body.drupal_uid !== undefined) {
    addArgs.drupal = {
      "email" : this.request.body.drupal_email,
      "uid" : this.request.body.drupal_uid
    }
  }
  addArgs.logged_date = new Date();

  var logEntry = new this.docModel(addArgs);
  logEntry.save(function(err) {
    if (err) {
      res.send(500, err);
    }

    // Added log entry to db
    res.send(201, addArgs);
  });
};

/**
 * Retrieve existing user log documents. Example request:
 * /api/v1/imports/2014-09-01/2014-10-01?type=user&exists=1&source=niche.com
 *
 * @param req
 *   The request object in the GET callback.
 * @param res
 *   The response object in the GET callback.
 */
UserImport.prototype.get = function(req, res) {

  if (req.param("start_date") == 0) {
    var targetStartDate = new Date('2014-08-01');
  }
  else {
    var targetStartDate = new Date(req.param("start_date"));
  }
  if (req.param("end_date") == 0) {
    var targetEndDate = new Date();
  }
  else {
    var targetEndDate = new Date(req.param("end_date"));
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
        return;
      }

      // Send results
      console.log('Summary query returned.');
      data.response.send(201, docs);
  })
};

module.exports = UserImport;
