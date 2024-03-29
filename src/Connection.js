import Promise from 'es6-promise'
import firebase from 'firebase/compat/app'
import { getAuth as getAuthWeb, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth'
import { getAuth as getAuthRN, initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native'
import 'firebase/compat/database'

let AsyncStorage
try {
  AsyncStorage = require('@react-native-async-storage/async-storage')
} catch (e) {
  AsyncStorage = null
}

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
      return firebase.initializeApp(config, name)
    } catch (e) {
      return firebase.app(name)
    }
  }

  function getAuth(app) {
    if (AsyncStorage) {
      try {
        return initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        })
      } catch (e) {
        return getAuthRN(app)
      }
    } else {
      return getAuthWeb(app)
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
    return app.database()
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
