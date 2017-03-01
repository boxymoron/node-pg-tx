
let count = 0;

/**
 * Technically, this should be a POST, but easier to test.
 */
exports.get = function(req, res){
	count++;
	process("test-"+(count % 12), res);

};

//This is new code usinf Promises
const process = function (UUID, res){	

	var runQuery = (ctx) => {
		return new Promise(function(resolve, reject){
			var query = 'SELECT count FROM node_test WHERE UUID = $1';
			console.log("Running query: "+query);
			ctx.client.query(query, [UUID], function(err, result) {
				if(err){
					return reject(err);
				}else{
					ctx.result = result;
					return resolve(ctx);
				}
			});
		});
	};
	
	var runUpsert = (ctx) => {
		return new Promise(function(resolve, reject){
			if(ctx.result.rows.length == 1){	
				var update = "UPDATE node_test SET count = count + 1 WHERE uuid = $1";
				console.log("Running update: "+update+" where uuid: "+UUID);
				ctx.client.query(update, [UUID], function(err, result) {
					if(err){
						ctx.err = err;
						return reject(ctx);
					}else{
						console.log("Update for: "+UUID+" complete");
						var newCount = ctx.result.rows[0].count + 1;
						ctx.model = {title: 'Hello '+UUID, body: "Hello "+UUID+". This is your "+newCount+" request.", newlyCreated: false};
						return resolve(ctx);
					}
				});
			}else{
				var insert = 'INSERT INTO node_test VALUES ($1, $2)';
				console.log("Running insert: "+insert+" WHERE uuid = "+UUID);
				ctx.client.query(insert, [1, UUID], function(err, result) {
					if(err){
						ctx.err = err;
						return reject(ctx);
					}else{
						ctx.model = {title: 'Hello '+UUID, body: "Hello "+UUID+". This is your 1st request. ", newlyCreated: true};
						return resolve(ctx);
					}
				});
			}
		});
	};

	var sendResponse = (ctx) => {
		console.log("Sending HTTP Response: "+ctx.model);
		var status = ctx.model.newlyCreated ? 201 : 200;
		res.status(status).render('fib', {
			layout: false,
			title: ctx.model.title,
			body: ctx.model.body,
			ctx: ctx
		});
	};
	
	//See ../service/database.js for Context, connectDB, rollback, and beginTransaction definition
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
		console.log(ctx.err);
		db.rollback(ctx);
		res.status(500).send('error: '+ctx.err);
	});

/*
 //This is old code using callbacks
	global.POOL.connect(function(err, client, done) {
		if(err){
			res.status(500).send('error: '+err);
			console.log("error: "+err);
			throw err;
		}
		//'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE'
		client.query('BEGIN TRANSACTION', function(err) {
			if(err){
				res.status(500).send('error: '+err);
				console.log("error: "+err);
				return rollback(client, done);
			}

			process.nextTick(function() {
				var query = 'SELECT count FROM node_test WHERE UUID = $1';
				client.query(query, [UUID], function(err, result) {

					if(err){
						console.error("error running query:"+err);
						res.status(500).send('error: '+err);
						return rollback(client, done);
					}

					if(result.rows.length == 1){
						console.log("found count for "+UUID+", count="+result.rows[0].count);
						var update = "UPDATE node_test SET count = count + 1 WHERE uuid = $1";
						var newCount = result.rows[0].count + 1;
						client.query(update, [UUID], function(err, result) {
							if(err){
								console.error("error running update:"+err);
								res.status(500).send('error: '+err);
								return rollback(client, done);
							}else{
								console.log("Hello "+UUID+". This is your "+newCount+" request");
								res.render('fib', {
									layout: false,
									title: 'Hello '+UUID,
									body: "Hello "+UUID+". This is your "+newCount+" request. "
								});
								client.query('COMMIT', done);
							}
						});
					}else{
						console.log("Did not find count for "+UUID);

						var insert = 'INSERT INTO node_test VALUES ($1, $2)';
						client.query(insert, [1, UUID], function(err, result) {
							if(err){
								console.error("error running insert:"+err);
								res.status(500).send('error: '+err);
								return rollback(client, done);
							}else{
								res.render('fib', {
									layout: false,
									title: 'Hello '+UUID,
									body: "Hello "+UUID+". This is your "+newCount+" request. "
								});
								client.query('COMMIT', done);
							}
						});
					}
				});
			});
		});
	});
*/
};
