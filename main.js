/**
 * Created by diego on 8/12/15.
 */

var cluster = require('cluster'),
    config = require('./config/config.js'),
    log4n = require('./include/log/log4node.js'),
    log = new log4n.log(config.log);


var service = process.env.SERVICE;

if (!service) {
    log.logger.error('Debe proveer el parametro "SERVICE" para iniciar el servicio');
    process.exit();
} else {

    if (cluster.isMaster) {
        var numWorkers = require('os').cpus().length;
        log.logger.info('Master cluster %s setting up %s workers...', process.pid, numWorkers);

        for(var i = 0; i < numWorkers; i++) {
            cluster.fork();
        }

        cluster.on('online', function(worker) {
            log.logger.info('Worker %s is online', worker.process.pid);
        });

        cluster.on('exit', function(worker, code, signal) {
            log.logger.info('Worker %s died with code: %s, and signal: %s', worker.process.pid, code, signal);
            log.logger.info('Starting a new worker');
            cluster.fork();
        });
    } else {

        if (service === "WEB") {
            require('./mainWeb.js')(log);
        } else if (service === "TER") {
            require('./mainTer.js')(log);
        }
    }

}
