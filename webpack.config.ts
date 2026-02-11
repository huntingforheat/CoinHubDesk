import path from 'path';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import webpack, { Configuration as WebpackConfiguration } from "webpack";
import { Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

import HtmlWebpackPlugin from 'html-webpack-plugin';

interface Configuration extends WebpackConfiguration {
    devServer?: WebpackDevServerConfiguration;
}

import dotenv from 'dotenv';
dotenv.config();

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const isDevelopment = process.env.NODE_ENV !== 'production';

const config: Configuration = {
    name: 'coin',
    mode: isDevelopment ? 'development' : 'production',
    devtool: !isDevelopment ? 'hidden-source-map' : 'eval',
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {
            '@hooks': path.resolve(__dirname, 'src/hooks'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@layout': path.resolve(__dirname, 'src/layout'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@typings': path.resolve(__dirname, 'src/typings'),
            '@app-types': path.resolve(__dirname, 'src/types'),
        },
    },
    entry: {
        app: './src/index',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'babel-loader',
                options: {
                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                targets: { browsers: ['last 2 chrome versions'] },
                                debug: isDevelopment,
                            },
                        ],
                        '@babel/preset-react',
                        '@babel/preset-typescript',
                    ],
                    env: {
                        development: {
                            plugins: [['@emotion', { sourcemaps: true }], require.resolve('react-refresh/babel')],
                        },
                        production: {
                            plugins: ['@emotion']
                        }
                    },
                },
                exclude: path.join(__dirname, 'node_modules'),
            },
            {
                test: /\.css?$/,
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                type: 'asset/resource',  // Webpack 5+
                generator: {
                    filename: 'img/[name][hash][ext][query]'
                }
            }
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            async: false,
            // eslint: {
            //   files: "./src/**/*",
            // },
        }),
        new webpack.EnvironmentPlugin({
            NODE_ENV: isDevelopment ? 'development' : 'production',
            HUGGINGFACE_ACCESS_TOKEN: process.env.HUGGINGFACE_ACCESS_TOKEN || ''
        }),
        new HtmlWebpackPlugin({
            template: './public/index.html',
        }),
    ],
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].[contenthash].js',
        publicPath: '/',
        clean: true,
    },
    devServer: {
        // 활성화시 싱글페이지에서 /login, /signup등 가짜 주소를 만들어서 서버로 보내줌
        historyApiFallback: true, // react router
        port: 3091,
        devMiddleware: { publicPath: '/dist/' },
        static: { directory: path.resolve(__dirname, 'public') },
        // 프론트에서 cors 설정 해주는법
        // proxy: [
        //   {
        //     context: ['/api'],
        //     target: 'http://localhost:80',
        //     changeOrigin: true,
        //   },
        // ]
    },
};

// 배포를 위한 anyalzer 설정
if (isDevelopment && config.plugins) {
    config.plugins.push(new webpack.HotModuleReplacementPlugin());
    config.plugins.push(new ReactRefreshWebpackPlugin());
    // config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'server', openAnalyzer: true }));
}
if (!isDevelopment && config.plugins) {
    config.plugins.push(new webpack.LoaderOptionsPlugin({ minimize: true }));
    // config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'static' }));
}

export default config;