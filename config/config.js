'use strict';

var path = require('path');
var webpack = require('webpack');
var HtmlPlugin = require('webpack-html-plugin');
var merge = require('webpack-merge');
var HasteResolverPlugin = require('haste-resolver-webpack-plugin');
var moment = require('moment')
var NODE_ENV = process.env.NODE_ENV;
var ROOT_PATH = path.resolve(__dirname);
//console.log("ROOT_PATH",ROOT_PATH)
var DEMO_DIR = 'Examples';
var PUB_DIR = '../public';
var LOCAL_DIR = '/Users/liuzhanxin/Desktop/localenzyme/enzyme'
var config = {
  paths: {
    src: path.join(ROOT_PATH, '../Libraries'),
    demo: path.join(ROOT_PATH, DEMO_DIR),
     public: path.join(ROOT_PATH, PUB_DIR),
     local:LOCAL_DIR,
    demoIndex: path.join(ROOT_PATH, DEMO_DIR, '/UIExplorer/UIExplorerApp.web'),
    index:path.join(ROOT_PATH, DEMO_DIR,'dgt/index.web'),
    portal:path.join(ROOT_PATH, DEMO_DIR,'dgt/portal.web'),
  }
};

var mergeCommon = merge.bind(null, {
  resolve: {
    alias: {
      'react-native': 'ReactWeb',
      'ReactART': 'react-art'
    },
    extensions: ['', '.js', '.jsx', '.md', '.css', '.png', '.jpg'],
  },
  module: {
    loaders: [{
      test: /\.png$/,
      loader: 'url?limit=100000&mimetype=image/png',
      include: [config.paths.demo,config.paths.local,config.paths.public]
    }, {
      test: /\.jpg$/,
      loader: 'file',
      include: [config.paths.demo,config.paths.local,config.paths.public]
    }, {
      test: /\.json$/,
      loader: 'json',
    }, ]
  },
  plugins: [
    new HasteResolverPlugin({
      platform: 'web',
      blacklist: ['lib']
    }),
  ]
});

//entryArray:[{name:'a',path:'path',title:'htmlTitle',htmlFileName:'filename'}]
const defaultPoutputPath = './output';
function mergeRW(entryArray,outputPath){
  if(!outputPath){
    outputPath = defaultPoutputPath;
    console.log("null output path,use default: "+ defaultPoutputPath);
  }

 if(!entryArray){
    console.log("no input entry,do nothing");
    return;
  } 


  var tempEntry={};
  tempEntry['react-web']=['react-native']


 var pluginConfig = [
      new webpack.DefinePlugin({
        'process.env': {
          // This has effect on the react lib size
          'NODE_ENV': JSON.stringify('production'),
        }
      }),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        },
      }),
      new webpack.optimize.CommonsChunkPlugin('react-web', 'react-web.js'),
 ];
 
  entryArray.map((entry)=>{

     if(!entry.path ){
      console.log("entry has no name,continue to next!");
    //  continue;
    }
  

    if(!entry.name ){
      console.log("entry has no name,continue to next!");

     // continue;    
      entry.name = path.basename(entry.path,'.js');
    }
   
    if(!entry.title ){
      entry.title = entry.name;
      console.log("entry has no title,use name as title:" + entry.name);
    }
    if(!entry.htmlFileName ){
      entry.htmlFileName = entry.name + '.html';
      console.log("entry has no htmlFileName,use name as htmlFileName:" + entry.name);
    }
   tempEntry[entry.name]=entry.path;

   var newHtmlPlugin = new HtmlPlugin({
        filename: entry.htmlFileName ,
        hash: true,
        title: entry.title,
        chunks: ['react-web', entry.name]
      });
   pluginConfig.push(newHtmlPlugin);
 });

console.log(tempEntry,"sadasdasdadasdasd");
 return mergeCommon({
    devtool: 'source-map',
    entry: tempEntry,
    output: {
      path: outputPath,
      filename: '[name].js',
      sourceMapFilename: '[file].map',
    },
    plugins: pluginConfig,
    module: {
      loaders: [{
        test: /\.jsx?$/,
        loader: 'babel', // 'babel-loader' is also a legal name to reference
        query: {
          presets: ['react-native', 'stage-1']
        },
        include: [config.paths.demo, config.paths.src,config.paths.local,config.paths.public,config.paths.src],
      }]
    }
  });
}



  module.exports = mergeRW;

