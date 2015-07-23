var chai = require( 'chai' );
chai.use( require( 'chai-datetime' ) );

var expect = chai.expect;

var twitter = require( './../lib/twitter' );
var tweetFixture = require( './fixtures/tweet.json');

var mashapeFixture = require( './fixtures/mashape.json');

var nock = require( 'nock' );
var mashape = nock( 'https://sentinelprojects-skyttle20.p.mashape.com' )
              .post( '/' )
              .reply( mashapeFixture )

describe( 'twitter', function () {


  describe( '#init', function () {
    it.skip( 'should establish a stream connection to twitter', function () {

    } );
  } );


  describe( '#initialTransform', function () {
    it( 'should transform the tweet fixture to a simple version', function  (done) {
      twitter.initialTransform( tweetFixture )
        .then( function ( transform ) {
          expect( transform ).to.exist;
          expect( transform ).to.have.property( 'text', 'Along with our new #Twitterbird, we\'ve also updated our Display Guidelines: https://t.co/Ed4omjYs  ^JC' );
          expect( transform ).property( 'tweetedAt' ).to.equalDate( new Date( tweetFixture.created_at ) );
          expect( transform ).to.have.property( 'user', 'twitterapi' );
          expect( transform ).to.have.deep.property( 'location.type', 'Point' );
          expect( transform ).to.have.deep.property( 'location.coordinates[0]', -75.14310264 );
          expect( transform ).to.have.deep.property( 'location.coordinates[1]',  40.05701649 );
          expect( transform ).to.have.deep.property( 'location.lng', -75.14310264 );
          expect( transform ).to.have.deep.property( 'location.lat', 40.05701649 );
          done();
        } )
        .catch( done );
    } );
  } );

  describe( '#getSentiment', function () {
    it( 'should send tweet text to mashape api', function (done) {
      twitter.getSentiment( {
        text: 'Test Text',
        location: {}
      } )
      .then( function ( tweetWithSentiment ) {
        expect( tweetWithSentiment ).to.have.deep.property( 'seintiment.skittle' );
        expect( tweetWithSentiment ).to.have.deep.property( 'seintiment.skittle.docs' );
        expect( tweetWithSentiment ).to.have.deep.property( 'seintiment.skittle.docs[0].terms' );
        expect( tweetWithSentiment ).to.have.deep.property( 'seintiment.skittle.docs[0].lang' );
        expect( tweetWithSentiment ).to.have.deep.property( 'seintiment.skittle.docs[0].sentiment' );
        expect( tweetWithSentiment ).to.have.deep.property( 'seintiment.skittle.docs[0].sentiment_scores' );
        done();
      })
      .catch( done );
    } );
  } );


  describe( '#databaseInsert', function () {
    it.skip( 'should insert into the database', function (done) {
      // body...
    })
  })


} );