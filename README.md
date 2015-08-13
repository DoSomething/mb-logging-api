![https://david-dm.org/DoSomething/mb-logging-api.svg](https://david-dm.org/DoSomething/mb-logging-api.svg)

mb-logging-api
==============

An API to send logging data for persistant storage. Currently the persistant storage is a MongoDB.

###Endpoints

* **GET /api** - report basic details about the API
* **GET /api/v1**
* **POST /api/v1/imports?type=[user]&exists=[1]&source=[ niche | niche.com | hercampus | att-ichannel | teenlife ]**
  * @param type string
    ex. &type=user : The type of import, helps to define what collection the
     POST is added to.
  * @param exists integer
    &exists=1 : Flag to log entries of existing Drupal, Mailchimp and Mobile
    Commons users in the userImportModel.
  * @param source string
    &source=niche : Unique name to identify the source of the import data.
* **POST /api/v1/imports/summaries?type=[user]&source=[ niche | niche.com | hercampus | att-ichannel | teenlife ]**
  * @param type string
     ex. &type=user : The type of import.
  * @param source string
     &source=niche.com : Unique name to identify the source of the import data.
* **GET /v1/user/activity?type=[ vote ]&source=[ AGG ]**
  * @param type string
  * @param source string
* **POST /v1/user/activity?type=[ vote ]**
  * @param type string
  * POST:
    * email string  (required)
    * source string
    * activity_details seralized String
    * activity_date  Date

##### Environment
```
$ export NODE_ENV=<production | development>
```
- **`production`**:
  - Use production Mongo database connection settings defined in config/mb_config.json.

- **`development`**:
  - Use development Mongo database connection settings defined in config/mb_config.json.

##### Start as Deamon
```
$ PORT=4733 NODE_ENV=<production | development> forever start mb-logging-api-server.js
or
$ pm2 start mb-logging-api-pm2.json
```
