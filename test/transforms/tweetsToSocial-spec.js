/*
  Env
 */
process.env.MONGO_URL = 'mongodb://localhost/noobjs_test';

/*
  Module dependencies
 */
var async =   require( 'async' );
var tweetsToSocial = require( './../../lib/transforms/tweetsToSocial' );

/*
  Prepare DB
 */
var mongojs =  require( 'mongojs' );
var db = mongojs( process.env.MONGO_URL, [ 'socialDocs', 'tweets' ] );

/*
  Prepare Chai
 */
var chai = require( 'chai' );
var expect = chai.expect;
chai.use( require( 'chai-datetime' ) );

/*
  Prepare fixtures
 */
var tweetsFixture = require( './../fixtures/tweets.json');

/*
  DB helper functions
 */
var clearDb = function ( done ) {
  async.parallel( [
    function ( cb ) { db.socialDocs.remove( cb ); },
    function ( cb ) { db.tweets.remove( cb ); }
  ], done );
}

var addFixtureToDb = function ( done ) {
  db.tweets.insert( tweetsFixture, done );
}


describe( 'tweetsToSocial', function () {

  before( clearDb );
  after( clearDb );

  describe( '#insertIntoSocial()', function () {
    it( 'should insert into social docs as expected', function ( done ) {
      var testTweet = tweetsFixture[9];
      tweetsToSocial.insertIntoSocial( testTweet )
      .then( function () {
        db.socialDocs.find({}, function ( err, response ) {
          expect( err ).to.not.exist;
          expect( response ).to.exist;
          expect( response.length ).to.equal( 1 );
          expect( response[0] ).to.have.property( '_id', testTweet._id );
          expect( response[0] ).to.have.property( 'user', testTweet.user );
          expect( response[0] ).to.have.property( 'type', 'tweet' );
          expect( response[0] ).to.have.property( 'text', testTweet.text );
          expect( response[0] ).property( 'createdAt' ).to.equalDate( new Date( testTweet.tweetedAt ) );
          done();
        } );
      } )
      .catch( done )
    } );
    after( clearDb );
  } );

  describe( '#transform()', function () {
    before( addFixtureToDb );
    it( 'should insert many tweets into social docs', function ( done ) {
      tweetsToSocial.transform( {
        perPage: 2
      } )
      .then( function () {
        db.socialDocs.count({}, function ( err, count ){
          expect( err ).to.not.exist
          expect( count ).to.equal( 2 );
          done();
        })
      } )
      .catch( done )
    } );
    after( clearDb );
  } );

  describe( '#getDatabaseTotals()', function () {
    before( addFixtureToDb );
    it( 'should return database totals do something', function ( done ) {
      tweetsToSocial.getDatabaseTotals()
      .then( function ( total ) {
        expect( total ).to.equal( 10 );
        done();
      } )
      .catch( done )
    } );
    after( clearDb );
  } );

  describe( '#getChunkedArray()', function () {
    it( 'should return an array of options to map to #transform()', function ( done ) {
      var arr = tweetsToSocial.getChunkedArray( 10, 3 );

      expect( arr ).to.exist;
      expect( arr.length ).to.equal( 4 );
      expect( arr[0] ).to.have.property( 'page', 0 );
      expect( arr[0] ).to.have.property( 'perPage', 3 );
      expect( arr[1] ).to.have.property( 'page', 1 );
      expect( arr[1] ).to.have.property( 'perPage', 3 );
      expect( arr[2] ).to.have.property( 'page', 2 );
      expect( arr[2] ).to.have.property( 'perPage', 3 );
      expect( arr[3] ).to.have.property( 'page', 3 );
      expect( arr[3] ).to.have.property( 'perPage', 3 );
      expect( arr[4] ).to.not.exist;
      done();

    } );
    after( clearDb );
  } );

  describe('#init', function () {
    before( addFixtureToDb );
    it('should add all tweets to socialDocs through paging', function ( done ) {
      tweetsToSocial.init( 2 )
      .then( function () {
        db.socialDocs.count({}, function ( err, count ) {
          expect( err ).to.not.exist;
          expect( count ).to.exist;
          expect( count ).to.equal( 10 )
          done();
        } );
      } )
      .catch( done );
    } );
  } );
});