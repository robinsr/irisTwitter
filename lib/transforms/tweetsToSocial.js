/*
  Module Dependencies
 */
var when   =   require( 'when' );
var nodefn =   require( 'when/node' );
var request =  require( 'request' );
var mongojs =  require( 'mongojs' );
var objectId = mongojs.ObjectId;

/*
  
  Make DB connection

 */
var db = mongojs( process.env.MONGO_URL, [ 'socialDocs', 'tweets' ] );


var insertIntoSocial = function ( tweet ) {
  return when.promise( function ( resolve, reject ) { 
    db.socialDocs.insert( {
      _id: tweet._id,
      type: 'tweet',
      originId: null,
      text: tweet.text,
      createdAt: new Date( tweet.tweetedAt ),
      user: tweet.user
    }, function ( err ) {
      if ( err ) return reject( err );
      resolve();
    } );
  } );
}

var transform = function ( opts ) {

  var perPage = opts.perPage || 100;
  var page = opts.page || 0;

  console.log( perPage, page );


  return when.promise( function ( resolve, reject ) {
    
    db.tweets.find({
      // find all
    } )
    .sort( { tweetedAt: -1 } )
    .limit( perPage )
    .skip( page * perPage, function ( err, results ) {

      if ( err ) {
        return reject( err )
      }

      when.map( results, insertIntoSocial )
      .then( resolve )
      .catch( reject );
    } );
  } );
}

var getDatabaseTotals = function () {
  return when.promise( function ( resolve, reject ) {

    db.tweets.count({}, function ( err, count ) {

      if ( err ) {
        return reject( err );
      }

      return resolve( count );
    } )
  } )
}

var getChunkedArray = function ( count, perPage ) {
  var pages = Math.ceil( count/perPage );

  var _p = [];

  for ( var i = 0; i < pages; i++ ) {
    _p.push( {
      perPage: perPage,
      page: i
    } );
  };

  return _p;
}


module.exports.init = function ( perPage ) {

  perPage = perPage || 100;

  return getDatabaseTotals()
  .then(function (count) {

    var arr = getChunkedArray( count, perPage );

    return when.iterate( function ( index ) {
      return index + 1;
    }, function ( index ) {
      return index >= arr.length;
    }, function ( index ) {
      return transform( arr[index] );
    }, 0 );
  } );
};

module.exports.insertIntoSocial = insertIntoSocial;
module.exports.transform = transform;
module.exports.getDatabaseTotals = getDatabaseTotals;
module.exports.getChunkedArray = getChunkedArray;