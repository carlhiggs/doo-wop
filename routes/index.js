var express = require('express'); // require Express
var router = express.Router(); // setup usage of the Express router engine

/* PostgreSQL and PostGIS module and connection setup */
var pg = require("pg"); // require Postgres module

// Setup connection
var username = "spatial" // sandbox username
var password = "pepe!57" // read only privileges on our table
var host = "localhost"
var database = "li_ballarat" // database name
var conString = "postgres://"+username+":"+password+"@"+host+"/"+database; // Your Database Connection

// Set up your database query to display GeoJSON
var coffee_query = "SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json((mb_code11, ssc_name,walkability)) As properties FROM (SELECT abs_linkage.mb_code11,ssc_name, AVG(walkability) AS walkability,ST_Transform(geom,4326) AS geom FROM parcelmb LEFT JOIN ind_walkability on parcelmb.detail_pid = ind_walkability.detail_pid LEFT JOIN abs_linkage ON parcelmb.mb_code11 = abs_linkage.mb_code11 GROUP BY abs_linkage.mb_code11, ssc_name, geom) As lg) As f) As fc";

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

/* GET Postgres JSON data */
router.get('/data', function (req, res) {
    var client = new pg.Client(conString);
    client.connect();
    var query = client.query(coffee_query);
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    query.on("end", function (result) {
        res.send(result.rows[0].row_to_json);
        res.end();
    });
});

/* GET the map page */
router.get('/map', function(req, res) {
    var client = new pg.Client(conString); // Setup our Postgres Client
    client.connect(); // connect to the client
    var query = client.query(coffee_query); // Run our Query
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    // Pass the result to the map page
    query.on("end", function (result) {
        var data = result.rows[0].row_to_json // Save the JSON as variable data
        res.render('map', {
            title: "Ballarat: Walkability Index", // Give a title to our page
            jsonData: data // Pass data to the View
        });
    });
});

/* GET the filtered page */
router.get('/filter*', function (req, res) {
    var name = req.query.name;
    if (name.indexOf("--") > -1 || name.indexOf("'") > -1 || name.indexOf(";") > -1 || name.indexOf("/*") > -1 || name.indexOf("xp_") > -1){
        console.log("Bad request detected");
        res.redirect('/map');
        return;
    } else {
        console.log("Request passed")
        var filter_query = "SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json((mb_code11, ssc_name,walkability)) As properties FROM (SELECT abs_linkage.mb_code11,ssc_name, AVG(walkability) AS walkability,ST_Transform(geom,4326) AS geom FROM parcelmb LEFT JOIN ind_walkability on parcelmb.detail_pid = ind_walkability.detail_pid LEFT JOIN abs_linkage ON parcelmb.mb_code11 = abs_linkage.mb_code11 GROUP BY abs_linkage.mb_code11, ssc_name, geom) As lg WHERE ssc_name = \'" + name + "\') As f) As fc";
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query(filter_query);
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
            var data = result.rows[0].row_to_json
            res.render('map', {
                title: "Ballarat: Walkability Index",
                jsonData: data
            });
        });
    };
});
