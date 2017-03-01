exports.get = function(req, res){
  res.render('about', { title: 'This is the about page.' });
};