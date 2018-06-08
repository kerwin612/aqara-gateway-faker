module.exports = Log;

function Log() {
}

Log.prototype.info = function() {
    console.log.apply(null, arguments);
}
Log.prototype.debug = Log.prototype.info;
Log.prototype.error = Log.prototype.info;

