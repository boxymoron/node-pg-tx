# node-pg-tx
NodeJS PostgresSQL Transaction examples

This is a wrapper around the pg module to make a bit easier to re-use a transaction across multiple SQL statements.

The interesting bits are in: `routes/fib.js`  and `service/database.js`

Before running, initialize the db with the DDL below set the connection parameters to your database in `service/database.js`:
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