/**
 * PostgresSQL module wrapper.
 * @module service/database
 */
const pg = require('pg');
const uuid = require('uuid');

const db_config = {
	user: 'nodejs', //env var: PGUSER
	password: 'nodejs', //env var: PGPASSWORD
	database: 'royer', //env var: PGDATABASE
	host: 'localhost', // Server hosting the postgres database
	port: 5432, //env var: PGPORT
	max: 10, // max number of clients in the POOL
	idleTimeoutMillis: 300000, // how long a client is allowed to remain idle before being closed
};

const POOL = new pg.Pool(db_config);
exports.POOL = POOL;

POOL.on('error', function (err, client) {
	// if an error is encountered by a client while it sits idle in the POOL
	// the POOL itself will emit an error event with both the error and
	// the client which emitted the original error
	// this is a rare occurrence but can happen if there is a network partition
	// between your application and the database, the database restarts, etc.
	// and so you might want to handle it and at least log it out
	console.error('idle client error', err.message, err.stack);
});

const READ_COMMITTED = 'READ COMMITTED';
exports.READ_COMMITTED = READ_COMMITTED;

exports.Transaction = Transaction;

var Transaction = function(isolationLevel, transactionID){
    this._transactionID = transactionID;
    this.started = new Date();
    this.status = "Started";
    this.committed = null;
    this.transactionIsolation = isolationLevel;
};

Transaction.prototype.setCommitted = function(){
	this.status = "Committed";
	this.committed = new Date();
	this.statistics = {
		processingTime : (this.committed.getTime() - this.started.getTime())
	};
};

Transaction.prototype.setStatus = function(status){
	this.status = status;
};

Transaction.prototype.toString = function(){
	return JSON.stringify(this);
};

exports.Context = Context;
var Context = function(client, done) {
    this.client = client;
    this.done = done;
    this.transaction = null;
    this.err = null;
};

Context.prototype.setTransaction = function(isolationLevel, transactionID){
	this.transaction = new Transaction(isolationLevel === null ? READ_COMMITTED : isolationLevel, transactionID);
};

/**
 * 
 */
exports.connect = function(){
	return new Promise(function(resolve, reject){
		POOL.connect(function(err, client, done) {
			if(err){
				return reject(err);
			}else{
				return resolve(new Context(client, done));//return ctx
			}
		});
	});
};

const VALID_TX_ISOLATION_LEVELS = new RegExp("/^SERIALIZABLE|REPEATABLE READ|READ COMMITTED|READ UNCOMMITTED|READ WRITE|READ ONLY$/");
exports.beginTransaction = (ctx, isolationLevel) => {
	if(!isolationLevel.match(VALID_TX_ISOLATION_LEVELS)){
		ctx.err = new Error("Invalid transaction isolation level. Expected: "+VALID_TX_ISOLATION_LEVELS);
		return Promise.reject(ctx);
	}
	return new Promise(function(resolve, reject){
		ctx.client.query('START TRANSACTION ISOLATION LEVEL '+isolationLevel, function(err) {
			if(err){
				ctx.err = err;
				return reject(ctx);
			}else{
				return resolve(ctx);
			}
		});
	}).then((ctx) =>{
		return new Promise(function(resolve, reject){
			ctx.client.query('select txid_current()', function(err, result){
				if(err){
					ctx.err = err;
					return reject(ctx);
				}else if(result.rows.length === 1){
					ctx.setTransaction(isolationLevel, result.rows[0].txid_current);
					console.log("Started new transaction: "+ctx.transaction);
					return resolve(ctx);
				}else{
					ctx.err = new Error("Transaction is in unknown state: "+ctx.transaction);
					return reject(ctx);
				}
			});
		});
	});
};

exports.rollback = function(ctx) {
	return new Promise(function(resolve, reject){
		if(ctx.transaction){
			console.log("Rolling back transaction: "+ctx.transaction);
			ctx.client.query('ROLLBACK', function(err, result) {
				if(err){
					//if there was a problem rolling back the query
					//something is seriously messed up.  Return the error
					//to the done function to close & remove this client from
					//the POOL.  If you leave a client in the POOL with an unaborted
					//transaction weird, hard to diagnose problems might happen.
					ctx.err = err;
					ctx.done(err);
					return reject(ctx);
				}else{
					ctx.transaction.setStatus("Rolled-back");
				}
			});
		}else{
			console.log("No transaction, nothing to roll-back.");
		}
		return resolve(ctx);
	});
};

exports.commit = function(ctx){
	return new Promise(function(resolve, reject){
		ctx.client.query('COMMIT', function(err, result) {
			if(err){
				ctx.transaction.setStatus("Error");
				ctx.err = err;
				ctx.done(err);
				return reject(ctx);
			}else{
				ctx.transaction.setCommitted();
				console.log("Committed transaction: "+ctx.transaction);
				ctx.done(err);
				return resolve(ctx);
			}
		});
	});
};
