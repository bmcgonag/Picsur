const webpack = require('webpack');

module.exports = {
  plugins: [new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en/)],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env']],
          },
        },
      },
    ],
  },
};
