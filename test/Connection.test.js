/* eslint-disable no-unused-expressions */
import Connection, { DEFAULT_APP_NAME } from 'src/Connection'
import Promise from 'bluebird'

describe('Firebase::Connection(firebaseConfig, options)', () => {
  let firebaseConfig = {
    authDomain: 'YOUR_APP.firebaseapp.com',
    databaseURL: 'https://YOUR_APP.firebaseio.com'
  }
  let getAuthToken
  let getConnection, FB
  let authMethods, authSuccess
  let authTokenDeferred

  beforeEach(() => {
    getAuthToken = sinon.stub()

    authMethods = {
      onAuthStateChanged: (cb) => {
        authSuccess = cb
      },
      signInWithCustomToken: sinon.stub(),
      signInAnonymously: sinon.stub()
    }
    FB = {
      app: sinon.stub(),
      initializeApp: sinon.stub(),
      auth: sinon.stub()
    }
    FB.auth.returns(authMethods)
    FB.initializeApp.returns({
      database: sinon.stub()
    })
    FB.app.returns({
      database: sinon.stub()
    })
    authMethods.signInAnonymously.returns({
      catch: sinon.stub()
    })

    Connection.__Rewire__('firebase', FB)
    authTokenDeferred = Promise.defer()
    getAuthToken.returns(authTokenDeferred.promise)
  })

  afterEach(() => {
    Connection.__ResetDependency__('firebase')
  })

  describe('Argument Error Behavior', () => {
    it('should throw an TypeError when `isAnonymous = false` and `getAuthToken` is not a function', () => {
      try {
        Connection(firebaseConfig, { isAnonymous: false })
      } catch (err) {
        expect(err.name).to.equal('TypeError')
        expect(err.message).to.equal('getAuthToken should be a function for non-anonymous auth')
      }
    })
    it('should throw an TypeError when `isAnonymous = true` and `getAuthToken` is a function', () => {
      try {
        Connection(firebaseConfig, { isAnonymous: true, getAuthToken: () => {} })
      } catch (err) {
        expect(err.name).to.equal('TypeError')
        expect(err.message).to.equal('getAuthToken should not be given for anonymous auth')
      }
    })
  })

  describe('#getConnection', () => {
    let authToken = 'the-token'
    let user = {
      name: 'user'
    }

    describe('getConnection behaviors', () => {
      beforeEach(() => {
        getConnection = Connection(firebaseConfig, { getAuthToken })
        getConnection()
      })
      it('returns `getConnection` as a function', () => {
        expect(getConnection).to.be.an.instanceof(Function)
      })
      it('inits firebase connection if not inited yet', () => {
        expect(FB.initializeApp).to.have.been.calledWith(
          firebaseConfig,
          DEFAULT_APP_NAME
        )
      })
    })

    describe('when call Connection with `getAuthToken`', () => {
      beforeEach(() => {
        getConnection = Connection(firebaseConfig, {
          getAuthToken,
          isAnonymous: false
        })
      })
      it('retrieve firebase authToken using `getAuthToken`', () => {
        getConnection()
        expect(getAuthToken).to.have.been.called
      })
      it.skip('`authWithCustomToken` if getAuthToken success', (done) => {
        getConnection()
        authTokenDeferred.resolve(authToken)
        authTokenDeferred.promise.then(() => {
          expect(authMethods.signInWithCustomToken).to
            .have.been.calledWith(authToken)
          done()
        })
      })
      it.skip('should not doulbe-auth', (done) => {
        getConnection()
        authTokenDeferred.resolve(authToken)
        authTokenDeferred.promise.then(() => {
          authSuccess(user)
          getConnection()
          expect(getAuthToken).to.have.been.calledOnce
          done()
        })
      })
      it('should not auth when authorizing', () => {
        getConnection()
        getConnection()
        expect(getAuthToken).to.have.been.calledOnce
      })
    })

    describe('when call Connection without `getAuthToken`', () => {
      beforeEach(() => {
        getConnection = Connection(firebaseConfig, { isAnonymous: true })
      })
      it.skip('should call `authAnonymously`', () => {
        getConnection()
        expect(authMethods.signInAnonymously).to.have.been.called
      })
      it.skip('should not doulbe-auth', () => {
        getConnection()
        authSuccess(user)
        getConnection()
        expect(authMethods.signInAnonymously).to.have.been.calledOnce
      })
      it.skip('should not auth when authorizing', () => {
        getConnection()
        getConnection()
        expect(authMethods.signInAnonymously).to.have.been.calledOnce
      })
    })
  })
})
