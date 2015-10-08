/* jshint node:true */

/*
 * Cache related operation
 */
var redis = require('redis');
var redisclient;
var stub = {
    cache: new Object(),

    put: function(key, val, cb) {
        this.cache[key] = val;
        cb(null, "OK");
    },

    get: function(key, cb) {
        cb(null, this.cache[key]);
    },

    remove: function(key, cb) {
        delete this.cache[key];
        cb(null, "OK");
    }
};

// either use the real DataCache service if available or fall back onto a local in-memory stub
if(process.env.hasOwnProperty("VCAP_SERVICES")) {
    var env = JSON.parse(process.env.VCAP_SERVICES);
    var redisprops = getEnv(env);

    // validate that not only are we within bluemix, but we have a bound Redis service
    if(typeof redisprops != "undefined") {
		var options = {
            			host: redisprops.hostname,
						port: redisprops.port, 
		                auth_pass: redisprops.password
					  };
			
    	redisclient = redis.createClient(options);
		redisclient.on("connect", function () {
           console.log("Connect to redis successful");
        });
		redisclient.on("error", function (err) {
           console.log("redis  error " + err);
        });
	
    } else {
    	console.log("WARNING: using non-persistent in memory storage instead of DataCache.");
	redisclient = stub;
    }
} else {
    console.log("WARNING: using non-persistent in memory storage instead of DataCache.");
    redisclient = stub;
}

exports.getCache = function(req, res) {
	var key = req.params.key;
	console.log("get key:" + key);
	redisclient.get(key, function(err, reply) {
	   if (err) {
	      res.json({
		     value : "The get failed for the key " + key + " error is "  + err
		  });	
	   }	
	   else {		   		
		   res.json({
		    value : reply		
		   });		
	   }
	});
};

exports.putCache = function(req, res) {
	var key = req.query.key;
	var value = req.query.value;
		
	redisclient.set(key, value, function(err, reply) {
		if (err) {
			res.json({
			   value : "The put failed for the key " + key + " error is "  + err
		   });
		   console.log('Put failed with error ' + err);
		}
		else {
		   res.json({
			   value : "The put was successful for the key " + key + " and value " + value + "."
		   });
		   console.log('finished put');
	}
	});
};

exports.removeCache = function(req, res) {
	var key = req.params.key;
	redisclient.del(key, function(err, reply) {
		if (err) {
			res.json({
			value : "The delete failed for the key " + key + " error is "  + err
		   });
		   console.log('Remove failed with error ' + err);
		}
		else {
			if (reply === 1) {
		      res.json({
			      value : "The delete was successful for the key " + key
		      });
			}
            else {
			  res.json({
			      value : "The key " + key + " was not found"
		      });
			}			
		    console.log('finished remove');
	}
	});
};

/**
 * Need to ignore the version number of Redis when getting the credentials.
 */
function getEnv(vcapEnv) {
   for (var serviceOfferingName in vcapEnv) {
   	    if (vcapEnv.hasOwnProperty(serviceOfferingName) &&
   	    		serviceOfferingName.indexOf("redis-") === 0) {
   	    	var serviceBindingData = vcapEnv[serviceOfferingName][0];
   	    	return serviceBindingData.credentials;
   	    }
   }
}