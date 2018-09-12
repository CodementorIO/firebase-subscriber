import Promise from 'yaku/lib/yaku.core'
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'

export const DEFAULT_APP_NAME = 'default'

export default function (config, {
  getAuthToken,
  isAnonymous = false,
  needAuth = true
} = {}) {

  let app = getFirebaseApp()
  let authed = false
  let authorizing = false

  if (needAuth) {
    if (!isAnonymous && typeof getAuthToken !== 'function') {
      throw new TypeError('getAuthToken should be a function for non-anonymous auth')
    }
    if (isAnonymous && typeof getAuthToken === 'function') {
      throw new TypeError('getAuthToken should not be given for anonymous auth')
    }
  }

  return function getConnection() {
    if (!needAuth || authed) {
      return Promise.resolve(getDb())
    }

    if (!shouldAuth()) {
      return Promise.resolve(getDb())
    }

    return new Promise((resolve, reject) => {

      if (isAnonymous) {
        authAnonymousConnection().catch((error) => {
          onLoginFailure(error)
          reject(error)
        })
      } else {
        authConnection().catch((error) => {
          onLoginFailure(error)
          reject(error)
        })
      }

      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          onLoginSuccess()
          resolve(getDb())
        }
      })
    })
  }

  function getFirebaseApp () {
    let name = config.appName || DEFAULT_APP_NAME
    try {
      return firebase.initializeApp(config, name)
    } catch (e) {
      return firebase.app(name)
    }
  }

  function shouldAuth () {
    if (authorizing) {
      return false
    }
    return !authed
  }

  function onLoginSuccess () {
    authorizing = false
    authed = true
  }

  function onLoginFailure (error) {
    authorizing = false
    console.error('[FIREBASE signIn failed]', error)
  }

  function getDb () {
    return app.database()
  }

  function authAnonymousConnection () {
    authorizing = true
    return firebase.auth(app).signInAnonymously()
  }

  function authConnection () {
    authorizing = true
    return getAuthToken().then(authToken => {
      return firebase.auth(app).signInWithCustomToken(authToken)
    })
  }
}
