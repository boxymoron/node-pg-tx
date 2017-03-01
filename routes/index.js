exports.index = function(req, res){
	var options = {
			rejectUnauthorized: false,
			host: 'feeds.arstechnica.com',
			path: '/arstechnica/index'
	};

	callback = function(response) {
		var feedXML = '';

		//another chunk of data has been recieved, so append it to `str`
		response.on('data', function (chunk) {
			feedXML += chunk;
		});

		//the whole response has been recieved, so we just print it out here
		response.on('end', function () {
			var entries = [];
			var xmlDoc = xmljs.parseXml(feedXML, {cdata: true});
			var items = xmlDoc.find("//item");
			for(var i=0; i<items.length; i++){
				var contentEL = items[i].get("content:encoded", { content: 'http://purl.org/rss/1.0/modules/content/'});
				var contentEscaped = "<content>"+contentEL.text().replace('<![CDATA[', '').replace(']]>', '')+"</content>";
				
				var entry = {pubDate: new Date(items[i].get("pubDate").text()), link: items[i].get("link").text(), title: items[i].get("title").text()};
				var $ = cheerio.load(contentEscaped);
				$("img").each(function(i, elem) {
					  var src = $(this).attr('src');
					  if(src.match(/cdn.arstechnica.net/)){
						  console.log(src);
						  entry.image = src;
					  }else{
						  //
					  }
				});
				if(!entry.image){
					entry.image = "https://cdn.arstechnica.net/wp-content/uploads/2017/02/IMG_7671-980x735.jpg";
				}
				entries.push(entry);
			}
			
			res.render('index', { title: 'Hello', 'entries': entries });
		});
	}

	HTTP.request(options, callback).end();
	
};