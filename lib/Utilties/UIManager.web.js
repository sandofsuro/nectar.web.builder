






var UIManager={
measure:function measure(ref,callback){
var rect=ref.getBoundingClientRect();
callback(0,0,rect.width,rect.height,rect.left,rect.top);
},
measureLayout:function measureLayout(ref,relativeTo,errorCallback,callback){
var rect=ref.getBoundingClientRect();
var relativeRef=relativeTo.getBoundingClientRect();
callback(
rect.left-relativeRef.left,
rect.top-relativeRef.top,
rect.width,
rect.height);
}};


module.exports=UIManager;