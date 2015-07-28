/*
  Env
 */
process.env.MONGO_URL = 'mongodb://localhost/noobjs_test';

/*
  Module dependencies
 */
var nock =    require( 'nock' );
var async =   require( 'async' );
var twitter = require( './../lib/twitter' );

/*
  Prepare DB
 */
var mongojs =  require( 'mongojs' );
var db = mongojs( process.env.MONGO_URL, [ 'socialDocs', 'skyttleDocs', 'geoDocs' ] );

/*
  Prepare Chai
 */
var chai = require( 'chai' );
var expect = chai.expect;
chai.use( require( 'chai-datetime' ) );

/*
  Prepare fixtures
 */
var mashapeFixture = require( './fixtures/mashape.json');
var tweetFixture = require( './fixtures/tweet.json');
tweetFixture._id = new mongojs.ObjectId();

/*
  DB helper function
 */
var clearDb = function ( done ) {
  async.parallel( [
    function ( cb ) { db.socialDocs.remove( cb ); },
    function ( cb ) { db.skyttleDocs.remove( cb ); },
    function ( cb ) { db.geoDocs.remove( cb ); }
  ], done );
}


describe( 'twitter', function () {

  before( clearDb );
  after( clearDb );


  describe.skip( '#init', function () {
    it( 'should establish a stream connection to twitter', function () {
    } );
  } );


  describe( '#insertIntoSocialDocs', function () {
    it( 'should transform the tweet fixture to a simple version and insert into socialDocs', function  (done) {
      twitter.insertIntoSocialDocs( tweetFixture )
        .then( function ( ) {
          db.socialDocs.findOne({}, function ( err, doc ) {
            expect( err ).to.not.exist;
            expect( doc ).to.exist;
            expect( doc._id.toString() ).to.equal( tweetFixture._id.toString() );
            expect( doc ).to.have.property( 'text', 'Along with our new #Twitterbird, we\'ve also updated our Display Guidelines: https://t.co/Ed4omjYs  ^JC' );
            expect( doc ).property( 'createdAt' ).to.equalDate( new Date( tweetFixture.created_at ) );
            expect( doc ).to.have.property( 'user', 'twitterapi' );
            expect( doc ).to.have.property( 'originId', tweetFixture.id );
            expect( doc ).to.have.property( 'type',  'tweet' );
            done();
          } );
        } )
        .catch( done );
    } );
  } );

  describe( '#insertIntoGeoDocs', function () {
    it( 'should not make the insert because tweet has no geo data', function ( done ) {
      twitter.insertIntoGeoDocs( {}, {} )
        .then( function () {
          db.geoDocs.findOne({}, function ( err, doc ) {
            expect( err ).to.not.exist;
            expect( doc ).to.not.exist;
            done();
          } );
        } )
        .catch( done )
    } );


    it( 'should not make the insert because no sentiment', function ( done ) {
      twitter.insertIntoGeoDocs( {}, null )
        .then( function () {
          db.geoDocs.findOne({}, function ( err, doc ) {
            expect( err ).to.not.exist;
            expect( doc ).to.not.exist;
            done();
          } );
        } )
        .catch( done )
    } );


    it( 'should insert data into geoDocs', function ( done ) {
      var sentimentScores = {
        pos: 0,
        neg: 1,
        neu: 2
      };

      twitter.insertIntoGeoDocs( tweetFixture, sentimentScores )
        .then( function () {
          db.geoDocs.findOne({}, function ( err, doc ) {
            expect( err ).to.not.exist;
            expect( doc ).to.exist;
            expect( doc ).to.have.property( 'type',  'tweet' );
            expect( doc ).to.have.property( 'socialId' );
            expect( doc.socialId.toString() ).to.equal( tweetFixture._id.toString() );
            expect( doc ).to.have.property( 'analyzableText',  twitter.getAnalyzableText( tweetFixture.text ) );
            expect( doc ).property( 'createdAt' ).to.equalDate( new Date( tweetFixture.created_at ) );
            expect( doc ).to.have.deep.property( 'location.type', 'Point' );
            expect( doc ).to.have.deep.property( 'location.coordinates[0]', tweetFixture.coordinates.coordinates[0] );
            expect( doc ).to.have.deep.property( 'location.coordinates[1]', tweetFixture.coordinates.coordinates[1] );
            expect( doc ).to.have.property( 'neg',  sentimentScores.neg );
            expect( doc ).to.have.property( 'neu',  sentimentScores.neu );
            expect( doc ).to.have.property( 'pos',  sentimentScores.pos );
            done();
          } );
        } )
        .catch( done )
    } );
  } );

  describe('#getAnalyzableText', function () {
    it('should do nothing', function () {
      var testText = "I am a plain tweet";
      expect( twitter.getAnalyzableText( testText ) )
        .to.equal( testText );
    });
    
    it('should remove a url', function () {
      var testText = "So who's trynna go with me!! (: http://t.co/m8ETAWwClV";
      expect( twitter.getAnalyzableText( testText ) )
        .to.equal( "So who's trynna go with me!! (:" );
    });

    it('should remove a url but leave hashes intact', function () {
      var testText = "Of course the #FremontBridge goes up when I'm #cycling #seattlecycling at Fremont Bridge https://t.co/cn2kZ3IT7g";
      expect( twitter.getAnalyzableText( testText ) )
        .to.equal( "Of course the #FremontBridge goes up when I'm #cycling #seattlecycling at Fremont Bridge" );
    });

    it('should remove trailing checkins "@"', function () {
      var testText = "Of course the #FremontBridge goes up when I'm cycling #seattlecycling @ Fremont Bridge https://t.co/cn2kZ3IT7g";
      expect( twitter.getAnalyzableText( testText ) )
        .to.equal( "Of course the #FremontBridge goes up when I'm cycling" );
    });

    it('should remove parenthesis wrapped checkins', function () {
      var testText = "Doing this thing at this place #funTimes (@ Some Place Seattle, WA)";
      expect( twitter.getAnalyzableText( testText ) )
       .to.equal( "Doing this thing at this place" );
    });

    it('should remove truncated checkins', function () {
      var testText = "Doing this thing at this place #funTimes @ Some Place...";
      expect( twitter.getAnalyzableText( testText ) )
       .to.equal( "Doing this thing at this place" );
    });

    it('should remove really truncated checkins', function () {
      var testText = "Doing this thing at this place #funTimes @...";
      expect( twitter.getAnalyzableText( testText ) )
       .to.equal( "Doing this thing at this place" );
    });

    it('should remove urls and hashes at the end of a string', function () {
      var testText = "Want to work in #Seattle, WA? View our latest opening: http://t.co/LfEvwGXG5H #Healthcare #Job #Jobs #Hiring http://t.co/QtStQsY5XE";
      expect( twitter.getAnalyzableText( testText ) )
       .to.equal( "Want to work in #Seattle, WA? View our latest opening:" );
    });
  });

  describe( '#insertIntoSkyttleDocs', function () {
    it( 'should fail silently because there is no coordinates property', function ( done ) {
      var mashape = nock( 'https://sentinelprojects-skyttle20.p.mashape.com' )
              .post( '/' )
              .reply( {} )

      twitter.insertIntoSkyttleDocs( {} )
      .then( function ( scores ) {
        expect( scores ).to.not.exist;
        expect( mashape.isDone() ).to.not.be.ok;
        nock.cleanAll();
        done();
      })
      .catch( done );
    } );

    it( 'should handle a 400 error', function (done) {
      var mashape = nock( 'https://sentinelprojects-skyttle20.p.mashape.com' )
              .post( '/' )
              .reply( 400, '400 Error' )

      twitter.insertIntoSkyttleDocs( tweetFixture )
      .then( function () {
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

      twitter.insertIntoSkyttleDocs( tweetFixture )
      .then( function () {
        done( new Error( 'Did not handle 500' ) );
      })
      .catch( function ( err )  {
        expect( err.message ).to.equal( '500 Error' );
        done();
      } );
    } );

    it( 'should send tweet text to mashape api', function ( done ) {
      var mashape = nock( 'https://sentinelprojects-skyttle20.p.mashape.com' )
              .post( '/' )
              .reply( 200, mashapeFixture )

      twitter.insertIntoSkyttleDocs( tweetFixture )
      .then( function ( sentimentScores ) {
        expect( sentimentScores ).to.exist;
        db.skyttleDocs.findOne( {}, function ( err, doc ) {
          expect( err ).to.not.exist;
          expect( doc ).to.exist;
          expect( doc ).to.have.property( 'socialId' );
          expect( doc.socialId.toString() ).to.equal( tweetFixture._id.toString() );
          expect( doc ).to.have.property( 'terms' );
          expect( doc ).to.have.property( 'language' );
          expect( doc ).to.have.property( 'sentiment' );
          expect( doc ).to.have.property( 'sentiment_scores' );
          expect( doc ).to.have.deep.property( 'sentiment_scores.neg', mashapeFixture.docs[0].sentiment_scores.neg );
          expect( doc ).to.have.deep.property( 'sentiment_scores.pos', mashapeFixture.docs[0].sentiment_scores.pos );
          expect( doc ).to.have.deep.property( 'sentiment_scores.neu', mashapeFixture.docs[0].sentiment_scores.neu );
          done();
        } );
      } )
      .catch( done );
    } );
  } );


  describe( '#databaseInsert', function () {
    it.skip( 'should insert into the database', function (done) {
      // body...
    })
  })


} );