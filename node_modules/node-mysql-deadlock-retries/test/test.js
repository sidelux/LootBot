var mysql = require('mysql')
var async = require('async')
var cluster = require('cluster')
var os = require('os')

var numCPUs = os.cpus().length
var proxyMysqlDeadlockRetries = require('node-mysql-deadlock-retries')

if (cluster.isMaster) {
	for (var i = 0; i < 200; i++) {
		cluster.fork()
	}

	cluster.on('death',worker => {
		console.log('worker ' + worker.pid + ' died')
	})

} else {
	var pool = mysql.createPool({
		host:     'localhost',
		user:     'me',
		password: 'secret',
		database: 'my_db'
	})

	var retries = 25
	var minMillis = 1
	var maxMillis = 100
	var debug = 1

	proxyMysqlDeadlockRetries(pool, retries, minMillis, maxMillis, debug)

	async.times(20,(i,next) => {
		var number_of_times_to_try = 10

		var deadlockCauser = function(cb) {
			console.log('Querying',number_of_times_to_try,process.pid)
			var qry = `UPDATE orders SET number = '123'`
			pool.query(qry,(err,rows) => {
				if (err) {
					console.log(`ERROR HAS OCCURED - ${ err.message }`)
				}
				if (--number_of_times_to_try < 0) {
					return cb()
				}

				return deadlockCauser(cb)
			})
		}
		
		async.parallel([
			deadlockCauser,
			deadlockCauser,
			deadlockCauser,
			deadlockCauser,
			deadlockCauser,
			deadlockCauser,
			deadlockCauser
		],() => {
			number_of_times_to_try = 10000
			return next()
		})
	},() => {
		console.log('Finished')
	})
}

