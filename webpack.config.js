var path = require('path')

var config = {
  mode: 'development',
  entry: [
    './src/index'
  ],
  resolve: {
    modules: ['node_modules']
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    library: 'FirebaseSubscriber',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        include: __dirname
      }
    ]
  },
  devServer: {
    static: {
      directory: './example'
    },
    hot: true
  }
}

module.exports = config
