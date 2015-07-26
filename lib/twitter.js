/*
  Module Dependencies
 */
var extend =  require( 'util' )._extend;
var when   =  require( 'when' );
var request = require( 'request' );
var mongojs = require( 'mongojs' );
var twit =    require( 'twit' );

var Tweets;

/*
  
  Make DB connection

 */
var init = function () {
  var T = new twit({
      consumer_key:         process.env.TWITTER_CONSUMER_KEY
    , consumer_secret:      process.env.TWITTER_CONSUMER_SECRET
    , access_token:         process.env.TWITTER_ACCESS_TOKEN
    , access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET
  });
  Tweets = mongojs( process.env.MONGO_URL, [ 'tweets' ] ).tweets;
  T.stream('statuses/filter', { locations: seattle }).on('tweet', handleTweet);
  console.log( 'Twitter interface started' );
}

/*

  Setup tweet stream

 */

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

var getAnalyzableText = function ( text ) {

  // find all links, then remove
  var urlMatcher = /(https?:\/\/?[\da-z\.-]+\.[a-z\.]{2,6})([\/\w\.-]*)*\/?/g;
  var urls = [];
  while  ( match = urlMatcher.exec( text ) ) {
    urls.push(match[0]);
  }
  for (var i = urls.length - 1; i >= 0; i--) {
    text = text.replace( urls[i], "" );
    text = text.trim();
  };

  //remove @ Place - should only match once, but for now let's just iterate
  var atMatcher = /\(?@\s([\w\s,]+)\)?$/;
  while  ( match = atMatcher.exec( text ) ) {
    text = text.replace( match[0], "" );
    text = text.trim();
  }

  // remove hashes from end of string sequentially
  var hashMatcher = /(#\w+)\s*?$/;
  while  ( match = hashMatcher.exec( text ) ) {
    text = text.replace( match[0], "" );
    text = text.trim();
  }

  return text;
}

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

    tweet.analyzableText = getAnalyzableText( tweet.text );

    request( getRequestParams( tweet.analyzableText ), function ( err, response, body ) {
      if ( err ) return reject( err );

      if ( response.statusCode !== 200 ) {
        return reject( new Error( body ) );
      }

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

module.exports.init = init;
module.exports.getAnalyzableText = getAnalyzableText;
module.exports.initialTransform = initialTransform;
module.exports.databaseInsert = databaseInsert;
module.exports.getSentiment = getSentiment;