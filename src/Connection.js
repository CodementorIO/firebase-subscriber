import Promise from 'es6-promise'
import { initializeApp, getApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth'
import { getDatabase, ref } from 'firebase/database'

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

  return function getConnection () {
    if (!needAuth || authed) {
      return Promise.resolve(getDb())
    }

    return new Promise((resolve, reject) => {
      if (!authorizing) {
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
      }

      onAuthStateChanged(getAuth(app), (user) => {
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
      return initializeApp(config, name)
    } catch (e) {
      return getApp(name)
    }
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
    return {
      ref: (path) => ref(getDatabase(app), path)
    }
  }

  function authAnonymousConnection () {
    authorizing = true
    return signInAnonymously(getAuth(app))
  }

  function authConnection () {
    authorizing = true
    return getAuthToken().then(authToken => {
      return signInWithCustomToken(getAuth(app), authToken)
    })
  }
}
