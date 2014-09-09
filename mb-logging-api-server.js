var express = require('express')
    , mongoose = require('mongoose')
    , UserImport = require('./lib/userimport')
    , dslogger = require('./lib/dslogger')
    ;

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
var defaultPort = 4722;

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

  // Show all errors in development
  app.use(express.errorHandler({dumpException: true, showStack: true}));
});

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
var mongoUri = 'mongodb://localhost/mb-logging';
mongoose.connect(mongoUri);
mongoose.connection.on('error', function(err) {
  console.log('Unable to connect to the Mongo database (%s). Check to make sure the database is running.', mongoUri);
  process.exit();
});

var userImportModel;
var userImportCollectionName = 'userimport-niche';
mongoose.connection.once('open', function() {

  // User import logging schema for existing entries
  var userImportLoggingSchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    phone : {
      number : { type : String, trim : true },
      status : { type : String, trim : true }
    },
    email : {
      address : { type : String, trim : true },
      status : { type : String, trim : true },
      acquired : { type: Date, default: Date.now }
    },
    drupal : {
      email : { type : String, trim : true },
      uid : { type : Number }
    }
  });
  userImportLoggingSchema.set('autoIndex', false);

  // Logging model
  userImportModel = mongoose.model(userImportCollectionName, userImportLoggingSchema);

  console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});

/**
 * Routes
 */

/**
 * POST to /api/userimport/existing
 */
app.post('/api/userimport/existing', function(req, res) {
  if (req.body.email === undefined && req.body.phone === undefined & req.body.drupal_uid === undefined) {
    res.send(400, 'No email, phone or Drupal uid specified.');
    dslogger.error('POST /userimport request. No email, phone or Drupal uid specified.');
  }
  else {
    var userImport = new UserImport(userImportModel);
    userImport.post(req, res);
  }
});