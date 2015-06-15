var express = require('express')
    , mongoose = require('mongoose')
    , UserImport = require('./lib/user-import')
    , UserImportSummary = require('./lib/user-import-summary')
    , UserImportSummaryExisting = require('./lib/user-import-summary-existing')
    , dslogger = require('./lib/dslogger')
    ;
var mb_config = require(__dirname + '/config/mb_config.json');

/**
 * Initialize the logging mechanism. Defines filename to write to and whether
 * or not to also log to the console.
 */
dslogger.init('mb-logging-api-server', false);

/**
 * Parse command line arguments.
 *
 * -port -p
 *   Allows the caller to set the port that this app should run on.
 */
var listenForPort = false;
var overridePort = false;
var defaultPort = 4733;

process.argv.forEach(function(val, idx, arr) {
  if (listenForPort) {
    listenForPort = false;
    overridePort = parseInt(val);
  }

  if (val === '-port' || val === '-p') {
    listenForPort = true;
  }
});

/**
 * Express Setup
 */
var app = express();

app.configure(function() {

  // Replaces express.bodyParser() - parses request body and populates request.body
  app.use(express.urlencoded());
  app.use(express.json());

  // Checks request.body for HTTP method override
  app.use(express.methodOverride());

  // Perform route lookup based on url and HTTP method
  app.use(app.router);

  // catch 404 and forwarding to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

});

/// error handlers

// development error handler
// will print stacktrace
/*
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(500, err.status);

    res.render('error', {
      message: err.message,
      error: err
    });

  });
  // Show all errors in development with express
  app.use(express.errorHandler({dumpException: true, showStack: true}));
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

*/

/**
 * Start server.
 */
var port = overridePort || process.env.MB_LOGGING_API_PORT || defaultPort;
app.listen(port, function() {
  console.log('Message Broker Logging API server listening on port %d in %s mode.', port, app.settings.env);
});

/**
 * Mongo setup and config.
 */
var mongoUri = mb_config.mongo;
mongoose.connect(mongoUri);
mongoose.connection.on('error', function(err) {
  console.log('Unable to connect to the Mongo database (%s). Check to make sure the database is running.', mongoUri);
  process.exit();
});

var userImportModel;
var userImportCollectionName_Niche = 'userimport-niche';
var userImportCollectionName_HerCampus = 'userimport-hercampus';
var userImportCollectionName_ATT_iChannel = 'userimport-att-ichannel';
var userImportCollectionName_TeenLife = 'userimport-teenlife';
var importSummaryModel;
var importSummaryCollectionName = 'import-summary';

mongoose.connection.once('open', function() {

  // User import logging schema for existing entries
  var userImportLoggingSchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    origin : {
      name : { type : String, trim : true },
      processed : { type: Date }
    },
    source : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['niche', 'niche.com', 'hercampus', 'att-ichannel', 'teenlife']
    },
    phone : {
      number : { type : String, trim : true },
      status : { type : String, trim : true },
      acquired : { type: Date }
    },
    email : {
      address : { type : String, trim : true },
      status : { type : String, trim : true },
      acquired : { type: Date }
    },
    drupal : {
      email : { type : String, trim : true },
      uid : { type : Number }
    }
  });
  userImportLoggingSchema.set('autoIndex', false);
  // Logging model
  userImportModel_niche = mongoose.model(userImportCollectionName_Niche, userImportLoggingSchema);
  userImportModel_hercampus = mongoose.model(userImportCollectionName_HerCampus, userImportLoggingSchema);
  userImportModel_att_ichannel = mongoose.model(userImportCollectionName_ATT_iChannel, userImportLoggingSchema);
  userImportModel_teenlife = mongoose.model(userImportCollectionName_TeenLife, userImportLoggingSchema);

  // User import logging schema for summary reports
  var importSummarySchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    target_CSV_file : { type : String, trim : true },
    signup_count : { type : Number },
    skipped : { type : Number },
    existing : {
      mailchimp : { type : Number },
      drupal : { type : Number },
      mobile_commons : {
        undeliverable : { type : Number },
        existing : { type : Number },
        no_subscription : { type : Number },
        other : { type : Number },
        total : { type : Number }
      },
      total : { type : Number }
    },
    source : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['niche', 'niche.com', 'hercampus', 'att-ichannel', 'teenlife']
    },
    log_type : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['user_import']
    },
  });
  importSummarySchema.set('autoIndex', false);
  // Logging summary model
  importSummaryModel = mongoose.model(importSummaryCollectionName, importSummarySchema);

  console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});

/**
 * Routes
 */

/**
 * GET /api - report basic details about the API
 * GET /api/v1
 */
app.get('/api', function(req, res) {
  res.send(200, 'Message Broker Logging API (mb-logging-api). Available versions: v1 (/api/v1) See https://github.com/DoSomething/mb-logging-api for the related git repository.');
});
app.get('/api/v1', function(req, res) {
  res.send(200, 'Message Broker Logging API (mb-logging-api). Version 1.x.x, see wiki (https://github.com/DoSomething/mb-logging-api/wiki) for documentation');
});

/**
 * POST to /api/v1/imports
 *
 * @param type string
 *   ex. &type=user : The type of import, helps to define what collection the
 *   POST is added to.
 *
 * @param exists integer
 *   &exists=1 : Flag to log entries of existing Drupal, Mailchimp and Mobile
 *   Commons users in the userImportModel.
 *
 * @param source string
 *   &source=niche : Unique name to identify the source of the import data.
 */
app.post('/api/v1/imports', function(req, res) {
  if (req.query.type === undefined || req.query.exists === undefined || req.query.source === undefined || req.query.origin === undefined || req.query.processed_timestamp === undefined ||
      (req.body.email === undefined && req.body.phone === undefined && req.body.drupal_uid === undefined)) {
    res.send(400, 'Type, exists and source, origin or started_timestamp not specified or no email, phone or Drupal uid specified.');
    dslogger.error('POST /api/v1/imports request. No type, exists and source not specified or no email, phone or Drupal uid specified.');
  }
  else {

    // Use model based on source
    if (req.query.source.toLowerCase() === 'niche') {
      var userImport = new UserImport(userImportModel_niche);
      userImport.post(req, res);
    }
    else if (req.query.source.toLowerCase() === 'hercampus') {
      var userImport = new UserImport(userImportModel_hercampus);
      userImport.post(req, res);
    }
    else if (req.query.source.toLowerCase() === 'att-ichannel') {
      var userImport = new UserImport(userImportModel_att_ichannel);
      userImport.post(req, res);
    }
    else if (req.query.source.toLowerCase() === 'teenlife') {
      var userImport = new UserImport(userImportModel_teenlife);
      userImport.post(req, res);
    }
    else {
      console.log('POST /api/v1/imports request. Invalid source: ' + req.query.source);
      dslogger.error('POST /api/v1/imports request. Invalid source: ' + req.query.source);
    }
  }
});

/**
 * GET from /api/v1/imports/:start_timestamp/:end_timestamp
 */
app.get('/api/v1/imports/:start_date/:end_date', function(req, res) {
  var sd = new Date(req.param("start_date"));
  var ed = new Date(req.param("end_date"));
  if (sd != 'Invalid Date' && ed != 'Invalid Date') {
    if (req.query.type == 'user_import' && req.query.exists == 1 && req.query.source !== undefined) {
      var userImport = new UserImport(userImportModel);
      userImport.get(req, res);
    }
    else {
      res.send(400, 'type or exists setting specified not supported at this time.');
      dslogger.error('GET /api/v1/imports request. type or exists setting specified not supported at this time.');
    }
  }
  else {
    res.send(400, 'Validation error: /api/v1/imports/:start_date/:end_date -> Invalid start or end dates.');
    dslogger.error('GET /api/v1/imports/:start_date/:end_date request. Invalid start or end dates.');
  }
});

/**
 * POST to /api/v1/imports/summaries
 *
 * @param type string
 *   ex. &type=user : The type of import.
 *
 * @param source string
 *   &source=niche.com : Unique name to identify the source of the import data.
 */
app.post('/api/v1/imports/summaries', function(req, res) {
  if (req.query.type === undefined || req.query.source === undefined ||
      req.body.target_CSV_file === undefined || req.body.signup_count === undefined || req.body.skipped === undefined) {
    res.send(400, 'Type or source not specified or no target CSV file, signup count and skipped values specified.');
    dslogger.error('POST /api/v1/imports/summaries request. Type or source not specified or no target CSV file, signup count and skipped values specified.');
  }
  else {
    var userImportSummary = new UserImportSummary(importSummaryModel);
    userImportSummary.post(req, res);
  }
});

/**
 * POST to /api/v1/imports/summaries/existing
 *
 * @param type string
 *   ex. &type=user : The type of import.
 *
 * @param source string
 *   &source=niche.com : Unique name to identify the source of the import data.
 *
 * @param target_CSV_file string
 *   &target_CSV_file=2014-09-10.csv
 */
app.post('/api/v1/imports/summaries/existing', function(req, res) {
  if (req.query.type === undefined || req.query.source === undefined || req.query.target_CSV_file === undefined) {
    res.send(400, 'Type, source or target_CSV_file not specified.');
    dslogger.error('POST /api/v1/imports/summaries/existing request. Type, source or target_CSV_file not specified.');
  }
  else {
    var userImportSummaryExisting = new UserImportSummaryExisting(importSummaryModel);
    userImportSummaryExisting.post(req, res);
  }
});

/**
 * GET from /api/v1/imports/summaries/:start_timestamp/:end_timestamp
 */
app.get('/api/v1/imports/summaries/:start_date/:end_date', function(req, res) {
  var sd = new Date(req.param("start_date"));
  var ed = new Date(req.param("end_date"));
  if (sd != 'Invalid Date' && ed != 'Invalid Date') {
    if (req.query.type == 'user_import' && req.query.exists == 1) {
      var userImportSummary = new UserImportSummary(importSummaryModel);
      userImportSummary.get(req, res);
    }
    else {
      res.send(400, 'type or exists setting specified not supported at this time.');
      dslogger.error('GET /api/v1/imports/summaries/:start_date/:end_date request. type or exists setting specified not supported at this time.');
    }
  }
  else {
    res.send(400, 'Validation error: /api/v1/imports/summaries/:start_date/:end_date -> Invalid start or end dates.');
    dslogger.error('GET /api/v1/imports/summaries/:start_date/:end_date request. Invalid start or end dates.');
  }
});
