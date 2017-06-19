const express = require('express');
const app = express();
const net = require('net');
const parser = require('body-parser');
const jsonParser = parser.json();
const moment = require('moment');
const cors = require('cors');
const path = require('path');
const webpack = require('webpack');
const UUID = require('uuid');
const fs = require('fs');
const absolute_path = '';
const archiver = require('archiver');
const unzipMoudle = require('unzip');
const log4js = require('log4js');
const adm_zip = require('adm-zip')

log4js.configure({
    appenders: [{
        type: 'file',
        filename: 'log/build.log'
    }]
})
var logger = log4js.getLogger('custom-appender');


var status = {};

app.use(cors())
app.use(function (req, res, next) {
    console.log('workspace called @' + moment().format("YYYY-MM-DD HH:mm:ss") + '\nurl=' + req.url + '\tbody=' + req.body);
    next();
});


app.use(express.static(path.join(__dirname, 'public')));



//relative_path: /Examples/dgt/index.web.js
//absolute_path: ''



//获取构建服务状态
app.get('/api/status', jsonParser, function (req, res) {

    var id = req.query.id;

    if (!id) {
        res.json({ state: 404, msg: "no id " });
    }

    if (!status[id]) {
        res.json({ state: 404, msg: "not found" });
        //utPutLog(log4js,id,"just a test");
    } else {
        res.json({ state: status[id], msg: getStatusMsg(status[id]) });
    }
});



//上传工程压缩包
app.post('/api/uploadProjectZip', function (req, res) {

    var id = req.query.id;
    // if(!status[id]){
    //     res.json({statusCode: 404,msg: "not found"});
    // }else{
    //     status[id] = -1;
    //     res.json({statusCode: status[id]});
    // }

    var filedir = path.resolve(__dirname, 'public', id, "projectzip");
    var filepath = filedir + '/' + "project.zip";

    fs.access(filedir, function (err) {
        if (err) {
            fs.mkdir(filedir);
        }
        req.pipe(fs.createWriteStream(filepath)).on('close', function () {
            // status[id] = 1;
            //msg: getStatusMsg(status[id])}
            res.json({ state: 200 });
        });
    });

    console.log(filepath);




});

// todo :获取构建日志
// app.post('/api/getLog',jsonParser,function(req,res){
//     var id = req.query.id;
//     if(!id){
//         callBackFailed(res,"no id");
//     }

// });



//下载构建结果
app.get('/api/download', function (req, res) {


    //console.log(req.query.filename);
    var filename = "bundle.zip";
    var id = req.query.id;

    if (!filename) {
        callBackFailed(res, "no filename");
    }
    if (!id) {
        callBackFailed(res, "no id");
    }

    var filepath = path.resolve(__dirname, 'public', id, 'bundlezip') + '/' + filename;
    //console.log(filepath);
    fs.createReadStream(filepath).pipe(res);//todo :出错处理
});

//执行构建
//todo : 构建服务控制接口
app.post('/api/buildBundle', jsonParser, function (req, res) {
    var id = req.query.id;
    var buildType = req.query.buildType;

    //开发期构建
    if (buildType == 'develop') {
        var entryfile_path = req.query.entryfile_path;
        if (!entryfile_path) {
            callBackFailed(res, "no entryfile_path");
            return;
        }

        var outPutPath = path.resolve(__dirname, 'public', id, 'result');
        createPath(outPutPath, function () {

            // var entryPath = path.resolve(absolute_path, entryfile_path);
            var entryPath = "/Users/liuzhanxin/Desktop/react-web-dgt/Examples/dgt/index.web.js";

            buildBundle([{ name: 'index', path: entryPath, title: 'index', htmlFileName: 'index.html' }], outPutPath, buildType, id, function () {
                res.json({ state: 200, msg: "success" });
            });
        });
    }

    //生产期构建，需要从配置文件中读取入口文件等相关配置
    else {
        var filedir = path.resolve(__dirname, 'public', id, "projectzip"); //压缩包所在文件夹
        var filepath = filedir + '/' + "project.zip"; //压缩文件路径
        var targetDir = path.resolve(__dirname, 'public', id, "project");//解压的目标路径
        unzipfile(filepath, targetDir, function () {

            var entryConfigPath = path.resolve(__dirname, 'public', id, 'project') + '/' + "build.json";
            var entryConfig = {};
            entryConfig = require(entryConfigPath);
            var outPutPath = path.resolve(__dirname, 'public', id, 'result');
            fs.access(outPutPath, function (err) {
                if (err) {
                    fs.mkdir(outPutPath);
                }

               var entries = [];
                for (var i in entryConfig) {

                    entryConfig[i].path = path.resolve(__dirname, 'public', id, "project") + entryConfig[i].path;
                    entries.push(entryConfig[i]);
                }
                console.log(entries);

                buildBundle(entries, outPutPath, buildType, id, function () {
                    status[id] = 2;
                    res.json({ state: 200 });
                });


            });


        });


    }

});


//获取构建工作空间
app.post('/api/getSpaces', jsonParser, function (req, res) {
    var id = UUID.v4();
    var outPutPath = path.resolve(__dirname, 'public', id);
    fs.access(outPutPath, function (err) {
        if (err) {
            fs.mkdir(outPutPath);
        }
    });
    res.json({ id: id, state: 200 });

});


var callBackFailed = function (res, msg) {
    res.json({ result: "faild", msg: msg });
}



var acServer = app.listen(9000, 300, function () {
    console.log("workspace ac start @" + 9000 + ' [port]');
});


//压缩文件
var zipfile = function (sourcePath, targetPath, callback) {
    fs.exists(sourcePath, function (exists) {
        if (exists) {
            fs.lstat(sourcePath, function (err, stat) {
                var archive = archiver('zip');
                archive.on('error', function (err) {
                    //exe_callback(err, null, callback);
                });
                var writeStream = fs.createWriteStream(targetPath);
                archive.pipe(writeStream);
                writeStream.on('close', function (err, data) {
                    //exe_callback(err, data, callback);
                });
                writeStream.on('error', function (err, data) {
                    //	exe_callback(err, data, callback);
                });
                if (stat.isDirectory()) {
                    archive.directory(sourcePath, "");
                } else {
                    archive.file(sourcePath, {
                        name: path.basename(sourcePath)
                    });
                }
                archive.finalize();
            });
        } else {
            //exe_callback(sourcePath + "不存在,压缩失败", null, callback);
        }
    });

};

//解压缩文件
var unzipfile = function (sourceZip, targetDir, callback) {
    fs.exists(sourceZip, function (exists) {
        if (exists) { //zip包存在
            fs.access(targetDir, function (err) {
                if (err) {
                    fs.mkdirSync(targetDir);

                    var unzip = new adm_zip(sourceZip);  
                    unzip.extractAllTo(targetDir, /*overwrite*/true);
                    console.log("success?")
                    callback();
                    // var readStream = fs.createReadStream(sourceZip);
                    // var writeStream = unzipMoudle.Extract({
                    //     path: targetDir
                    // });
                    // readStream.on('error', function (err, data) {
                    //     //exe_callback(err, data, callback);
                    //     //console.log("read error~~~~~~")
                    // });
                    // writeStream.on('error', function (err, data) {
                    //     //exe_callback(err, data, callback);
                    //     // console.log("write error~~~~~~~~~")
                    // });
                    // readStream.pipe(writeStream);
                    // writeStream.on('close', function () {
                    //     callback();
                    // });
                }
            }); //确保解压目录存在

        } else { //zip包不存在
            //exe_callback(sourceZip + "不存在，无法解压", null, callback);
        }
    });
};



//执行构建
var buildBundle = function (entryArray, outPutPath, buildType, id, callback) {
    var wc = require('./config/config');
    var wcResult = wc(entryArray, outPutPath);
    var compiler = webpack(wcResult);
    status[id] = 1;
    compiler.run(function (err, stats) {
        var options = {
            colors: true
        };

        console.log(stats.toString(options));
        // status[taskId] = -1;
        if (err)
        {
            
        }
           // console.log(err + "======================");
        else {

        }
        var zipPath = path.resolve(__dirname, 'public', id, 'bundlezip');
        var sourcePath = path.resolve(__dirname, 'public', id, 'result');
        fs.access(zipPath, function (err) {
            if (err) {
                fs.mkdir(zipPath);
            }
        });
        var zipFilePath = zipPath + '/bundle.zip';
        zipfile(sourcePath, zipFilePath);
        callback();

    });


};


var getStatusMsg = function (state) {
    switch (state) {
        case 1: return "building";
        // case 2: return "zipping";
        case 3: return "failed";
        case 4: return "success"
        default: return "unknown";
    }
};

var createPath = function (outPutPath, callback) {
    fs.access(outPutPath, function (err) {
        if (err) {
            fs.mkdir(outPutPath);
        }
        callback();
    });
};

var outPutLog = function (log4js, id, buildLog) {
    var outPutPath = path.resolve(__dirname, 'public', id, 'log');
    fs.access(outPutPath, function (err) {
        if (err) {
            fs.mkdir(outPutPath);
        }

        var filename = outPutPath + '/build.log';

        log4js.configure({
            appenders: [{
                type: 'file',
                filename: filename
            }]
        })
        var logger = log4js.getLogger('custom-appender');

        logger.debug(buildLog);
    });

}