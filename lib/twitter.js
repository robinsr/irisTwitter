/*
  Module Dependencies
 */
var extend =  require( 'util' )._extend;
var when   =  require( 'when' );
var request = require( 'request' );
var mongojs = require( 'mongojs' );
var twit =    require( 'twit' );

/*
  
  Make DB connection

 */
var Tweets = mongojs( process.env.MONGO_URL, [ 'tweets' ] ).tweets;

/*

  Setup tweet stream

 */
var T = new twit({
    consumer_key:         process.env.TWITTER_CONSUMER_KEY
  , consumer_secret:      process.env.TWITTER_CONSUMER_SECRET
  , access_token:         process.env.TWITTER_ACCESS_TOKEN
  , access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var seattle = [
  '-122.46',
  '47.5',
  '-122.22',
  '47.7'
];

var tweetCount = 0;

var handleTweet = function ( tweet ) {
  initialTransform( tweet )
  .then( getSentiment )
  .then( databaseInsert )
  .catch( handleError )
  .done( function ( tweet ) {
    console.log("Tweet Count: " + tweetCount++);
  } );
};

var handleError = function ( err ) {
  console.error( err );
};

var initialTransform = function ( rawTweetData ) {

  var newTweet = {
    text: rawTweetData.text,
    tweetedAt: new Date(rawTweetData.created_at),
    user: rawTweetData.user.screen_name
  };

  if (rawTweetData.coordinates && rawTweetData.coordinates.type == 'Point') {
    
    newTweet.location = {
      type: 'Point',
      coordinates: rawTweetData.coordinates.coordinates,
      lng: rawTweetData.coordinates.coordinates[0],
      lat: rawTweetData.coordinates.coordinates[1]
    }
  }

  return when.resolve( newTweet );
};


/*

  Setup NLP connection

 */
var getRequestParams = function ( text ) {
  return {
    method: 'POST',
    url: 'https://sentinelprojects-skyttle20.p.mashape.com/',
    headers: {
      'X-Mashape-Key': process.env.MASHAPE_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    form: {
      'annotate': 1,
      'keywords': 1,
      'lang': 'en',
      'sentiment' :1,
      'text': text
    }
  }
};

var getSentiment = function ( tweet ) {

  return when.promise( function ( resolve, reject ) {

    if ( !tweet.location ) {
      return resolve( tweet );
    }

    request( getRequestParams( tweet.text ), function ( err, response, body ) {
      if ( err ) return reject( err );

      if ( typeof body != "object" ) {
        try {
          body = JSON.parse( body );
        } catch ( e ) {
          return reject( err );
        }
      }

      extend( tweet, {
        sentiment: {
          skyttle: body
        }
      } );
      
      return resolve( tweet );

    } );
  } );
};


/*

  Make database insert

 */
var databaseInsert = function ( tweet ) {

  return when.promise( function ( resolve, reject ) {
    Tweets.insert( tweet, function ( err ) {
      if ( err ) return reject( err );
      resolve( tweet );
    } );
  } )
};

/*

  Exports

 */
module.exports.init = function () {
  T.stream('statuses/filter', { locations: seattle }).on('tweet', handleTweet);
}

module.exports.initialTransform = initialTransform;
module.exports.databaseInsert = databaseInsert;
module.exports.getSentiment = getSentiment;