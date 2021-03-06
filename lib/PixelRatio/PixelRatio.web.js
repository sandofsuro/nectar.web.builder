








'use strict';var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};}();

var _ReactDimensions=require('../Dimensions/Dimensions.web');var _ReactDimensions2=_interopRequireDefault(_ReactDimensions);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj};}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function");}}var
































PixelRatio=function(){function PixelRatio(){_classCallCheck(this,PixelRatio);}_createClass(PixelRatio,null,[{key:'get',value:function get()


















{
return _ReactDimensions2.default.get('window').scale;
}},{key:'getFontScale',value:function getFontScale()












{
return _ReactDimensions2.default.get('window').fontScale||PixelRatio.get();
}},{key:'getPixelSizeForLayoutSize',value:function getPixelSizeForLayoutSize(






layoutSize){
return Math.round(layoutSize*PixelRatio.get());
}},{key:'roundToNearestPixel',value:function roundToNearestPixel(







layoutSize){
var ratio=PixelRatio.get();
return Math.round(layoutSize*ratio)/ratio;
}},{key:'startDetecting',value:function startDetecting()


{}}]);return PixelRatio;}();


module.exports=PixelRatio;