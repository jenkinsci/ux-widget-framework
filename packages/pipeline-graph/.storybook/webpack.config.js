// const path = require('path');
// const TSDocgenPlugin = require('react-docgen-typescript-webpack-plugin');

module.exports = (baseConfig, env, config) => {

    // Typescript support

    config.module.rules.push({
        test: /\.(ts|tsx)$/,
        loader: require.resolve('awesome-typescript-loader'),
    });
    // config.plugins.push(new TSDocgenPlugin()); // optional
    config.resolve.extensions.push('.ts', '.tsx');

    // SCSS support

    config.module.rules.push({
        test: /\.scss$/,
        // loader: require.resolve('sass-loader'),
        loaders: ["style-loader", "css-loader", "sass-loader"],
    });

    return config;
};