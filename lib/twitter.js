/*
  Module Dependencies
 */
var when   =   require( 'when' );
var nodefn =   require( 'when/node' );
var request =  require( 'request' );
var mongojs =  require( 'mongojs' );
var twit =     require( 'twit' );
var objectId = mongojs.ObjectId;

/*
  
  Make DB connection

 */
var db = mongojs( process.env.MONGO_URL, [ 'socialDocs', 'skyttleDocs', 'geoDocs' ] );

var init = function () {
  var T = new twit({
      consumer_key:         process.env.TWITTER_CONSUMER_KEY
    , consumer_secret:      process.env.TWITTER_CONSUMER_SECRET
    , access_token:         process.env.TWITTER_ACCESS_TOKEN
    , access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET
  });

  T.stream( 'statuses/filter', { locations: seattle } ).on( 'tweet', handleTweet );

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

  tweet._id = new objectId();

  insertIntoSocialDocs( tweet )
  .then( function () {
    return insertIntoSkyttleDocs( tweet );
  } )
  .then( function ( sentimentScores ) {
    return insertIntoGeoDocs( tweet, sentimentScores );
  } )
  .catch( handleError )
  .done( function ( tweet ) {
    console.log("Tweet Count: " + tweetCount++);
  } );
};

var handleError = function ( err ) {
  console.error( err );
};

/*

  Save this tweet

 */
var insertIntoSocialDocs = function ( tweet ) {
  return when.promise( function ( resolve, reject ) { 
    db.socialDocs.insert( {
      _id: tweet._id,
      type: 'tweet',
      originId: tweet.id,
      text: tweet.text,
      createdAt: new Date( tweet.created_at ),
      user: tweet.user.screen_name
    }, function ( err ) {
      if ( err ) return reject( err );
      resolve();
    } );
  } );
};

/*

 If there is lat/lng and sentiment, save that separately for easy aggregations

 */
var insertIntoGeoDocs = function ( tweet, sentimentScores ) {
  
  if ( !tweet.coordinates || !sentimentScores ) {
    return when.resolve();
  }

  return when.promise( function ( resolve, reject ) {
    db.geoDocs.insert({
      socialId: tweet._id,
      type: 'tweet',
      analyzableText: getAnalyzableText( tweet.text ),
      createdAt: new Date( tweet.created_at ),
      location: tweet.coordinates,
      neg: sentimentScores.neg,
      neu: sentimentScores.neu,
      pos: sentimentScores.pos
    }, function ( err ) {
      if ( err ) return reject( err );
      resolve();
    } );
  } );
}

/*

  Basic scrubbing of tweet to remove non-sentiment

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
  var atMatcher = /(\(?@\s([\w\s,\.]+)\)?|@\.\.\.)$/;
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

/*

  Request params for making the call to skyttle

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


/*

  Get sentiment scores and save skyttle document

 */
var insertIntoSkyttleDocs = function ( tweet ) {
  
  // Disabling Skyttle
  return when.resolve( null );


  if ( !tweet.coordinates ) {
    return when.resolve( null );
  }

  tweet.analyzableText = getAnalyzableText( tweet.text );

  return when.promise( function ( resolve, reject ) {

    request( getRequestParams( tweet.analyzableText ), function ( err, response, body ) {
      if ( err ) return reject( err );

      if ( response.statusCode !== 200 ) {
        return reject( new Error( body ) );
      }

      if ( typeof body != "object" ) {
        try {
          body = JSON.parse( body );
        } catch ( e ) {
          return reject( e );
        }
      }

      if ( !body.docs || !body.docs.length ) {
        return reject( new Error( 'Skyttle did not return a document' ) )
      }

      var doc = body.docs[0];

      delete doc.doc_id;

      doc.socialId = tweet._id;

      db.skyttleDocs.insert( doc, function ( err ) {
        if ( err ) return reject( err );
        resolve( doc.sentiment_scores );
      } );
    } );
  } );
};

/*

  Exports

 */

module.exports.init = init;
module.exports.insertIntoSkyttleDocs = insertIntoSkyttleDocs;
module.exports.insertIntoGeoDocs = insertIntoGeoDocs;
module.exports.insertIntoSocialDocs = insertIntoSocialDocs
module.exports.getAnalyzableText = getAnalyzableText;