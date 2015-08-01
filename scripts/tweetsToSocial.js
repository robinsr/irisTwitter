var transform = require('./../lib/transforms/transform');


var transform = function ( tweet ) {
  return {
    _id: tweet._id,
    type: 'tweet',
    originId: null,
    text: tweet.text,
    createdAt: new Date( tweet.tweetedAt ),
    user: tweet.user
  }
}

var opts = {
  transform: transform,
  perPage: 100,
  sourceDb: 'tweets',
  targtDb: 'socialDocs'
}

transform.init( opts )
.then(function () {
  console.log('Success');
  process.exit(0);
})
.catch(function (err){
  console.error(err);
  process.exit(1);
})