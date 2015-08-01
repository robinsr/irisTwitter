/*
  Module Dependencies
 */
var when   =   require( 'when' );
var nodefn =   require( 'when/node' );
var request =  require( 'request' );
var mongojs =  require( 'mongojs' );
var _ =        require( 'lodash' );
var objectId = mongojs.ObjectId;

/*
  
  Make DB connection

 */
var db;

var insertIntoNewDatabase = function ( item, opts ) {
  return when.promise( function ( resolve, reject ) { 
    db[ opts.targetDb ].insert( opts.transform( item ), function ( err ) {
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
    
    db[ opts.sourceDb ].find( {} )
    .sort( { tweetedAt: -1 } )
    .limit( perPage )
    .skip( page * perPage, function ( err, results ) {

      if ( err ) {
        return reject( err )
      }

      when.map( results, function ( item ) {
        return insertIntoNewDatabase( item, opts );
      } )
      .then( resolve )
      .catch( reject );
    } );
  } );
}

var getDatabaseTotals = function ( opts ) {
  return when.promise( function ( resolve, reject ) {

    db[ opts.sourceDb ].count({}, function ( err, count ) {

      if ( err ) {
        return reject( err );
      }

      return resolve( count );
    } )
  } )
}

var getChunkedArray = function ( count, opts ) {
  var pages = Math.ceil( count / opts.perPage );

  var _p = [];

  for ( var i = 0; i < pages; i++ ) {
    _p.push( _.assign( { page: i }, opts ) );
  };

  return _p;
}


module.exports.init = function ( opts ) {

  return getDatabaseTotals( opts )
  .then(function (count) {

    var arr = getChunkedArray( count, opts );

    return when.iterate( function ( index ) {
      return index + 1;
    }, function ( index ) {
      return index >= arr.length;
    }, function ( index ) {
      return transform( arr[index] );
    }, 0 );
  } );
};

module.exports.prepare = function ( opts ){
  var targetDb = opts.targetDb;
  var sourceDb = opts.sourceDb;
  db = mongojs( process.env.MONGO_URL, [ targetDb, sourceDb ] );  
  return when.resolve();
}

module.exports.insertIntoNewDatabase = insertIntoNewDatabase;
module.exports.transform = transform;
module.exports.getDatabaseTotals = getDatabaseTotals;
module.exports.getChunkedArray = getChunkedArray;