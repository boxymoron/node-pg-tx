# node-pg-tx
NodeJS PostgresSQL Transaction wrapper.

This is a thin wrapper around the [pg](https://github.com/brianc/node-postgres "pg")  module to make it easier to execute multiple SQL statements in a single transaction. It also lets you set the transaction isolation level and makes committing and rolling back easier.

Example:
<pre>
	db.connect().then((ctx) =>{
		return db.beginTransaction(ctx, db.READ_COMMITTED);
	}).then((ctx) =>{
		return runQuery(ctx);
	}).then((ctx) => {
		return runUpsert(ctx);
	}).then((ctx) =>{
		return db.commit(ctx);
	}).then((ctx) =>{
		return sendResponse(ctx);
	}).catch((ctx) =>{
		var err = ctx.err;
		console.log(ctx.err);
		db.rollback(ctx);
		res.status(500).send('error: '+err);
	});
</pre>

The interesting bits are in: [service/database.js](https://github.com/boxymoron/node-pg-tx/blob/master/service/database.js "database.js")   and [routes/fib.js](https://github.com/boxymoron/node-pg-tx/blob/master/routes/fib.js "fib.js").

Before running, initialize the db with the DDL below and set the connection parameters to your database in [service/database.js](https://github.com/boxymoron/node-pg-tx/blob/master/service/database.js "database.js"):
<pre>
CREATE TABLE public.node_test
(
  count integer,
  uuid character varying(256) NOT NULL,
  CONSTRAINT "UUID_PK" PRIMARY KEY (uuid)
)
</pre>

To run:
<pre>
npm install
npm install supervisor -g
supervisor app.js
open http://localhost:8888/rest/fib
</pre>