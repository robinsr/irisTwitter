var tweetsToSocial = require('./../lib/transforms/tweetsToSocial')

tweetsToSocial.init(100)
.then(function () {
  console.log('Success');
  process.exit(0);
})
.catch(function (err){
  console.error(err);
  process.exit(1);
})