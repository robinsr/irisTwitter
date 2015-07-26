var chai = require( 'chai' );
chai.use( require( 'chai-datetime' ) );

var expect = chai.expect;

var twitter = require( './../lib/twitter' );
var tweetFixture = require( './fixtures/tweet.json');

var mashapeFixture = require( './fixtures/mashape.json');

var nock = require( 'nock' );

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

  describe('#getAnalyzableText', function () {
    
    it('should remove a url', function () {
      var test1 = "So who's trynna go with me!! (: http://t.co/m8ETAWwClV";
      expect( twitter.getAnalyzableText( test1 ) )
        .to.equal( "So who's trynna go with me!! (:" );
    });

    it('shoudl remove a url but leave hashes intact', function () {
      var test2 = "Of course the #FremontBridge goes up when I'm #cycling #seattlecycling @ Fremont Bridge https://t.co/cn2kZ3IT7g";
      expect( twitter.getAnalyzableText( test2 ) )
        .to.equal( "Of course the #FremontBridge goes up when I'm #cycling #seattlecycling @ Fremont Bridge" );
    });

    it('should remove urls and hashes at the end of a string', function () {
      var test3 = "Want to work in #Seattle, WA? View our latest opening: http://t.co/LfEvwGXG5H #Healthcare #Job #Jobs #Hiring http://t.co/QtStQsY5XE";
      expect( twitter.getAnalyzableText( test3 ) )
       .to.equal( "Want to work in #Seattle, WA? View our latest opening:" );
    });
  });

  describe( '#getSentiment', function () {
    it( 'should send tweet text to mashape api', function (done) {
      var mashape = nock( 'https://sentinelprojects-skyttle20.p.mashape.com' )
              .post( '/' )
              .reply( mashapeFixture )

      twitter.getSentiment( {
        text: 'Test Text #endHash #endHash2 http://t.co.com/path',
        location: {}
      } )
      .then( function ( tweetWithSentiment ) {
        expect( tweetWithSentiment ).to.have.property( 'analyzableText', 'Test Text' );
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


    it( 'should handle a 400 error', function (done) {
      var mashape = nock( 'https://sentinelprojects-skyttle20.p.mashape.com' )
              .post( '/' )
              .reply( 400, '400 Error' )

      twitter.getSentiment( {
        text: 'Test Text',
        location: {}
      } )
      .then( function (  ) {
        done( new Error( 'Did not handle 500' ) );
      })
      .catch( function ( err )  {
        expect( err.message ).to.equal( '400 Error' );
        done();
      } );
    } );

    it( 'should handle a 500 error', function (done) {
      var mashape = nock( 'https://sentinelprojects-skyttle20.p.mashape.com' )
              .post( '/' )
              .reply( 500, '500 Error' )

      twitter.getSentiment( {
        text: 'Test Text',
        location: {}
      } )
      .then( function (  ) {
        done( new Error( 'Did not handle 500' ) );
      })
      .catch( function ( err )  {
        expect( err.message ).to.equal( '500 Error' );
        done();
      } );
    } );
  } );


  describe( '#databaseInsert', function () {
    it.skip( 'should insert into the database', function (done) {
      // body...
    })
  })


} );