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
const exec = require('child_process').exec;

// log4js.configure({
//     appenders: [{
//         type: 'file',
//         filename: 'log/build.log'
//     }]
// })
// var logger = log4js.getLogger('custom-appender');


var status = {};
var is_building = false;


app.use(cors())
app.use(function (req, res, next) {
    console.log('workspace called @' + moment().format("YYYY-MM-DD HH:mm:ss") + '\nurl=' + req.url + '\tbody=' + req.body);
    next();
});


//开发期预览不要这个
var assets_path = path.join(__dirname, 'public');
fs.access(assets_path, (err) => {
    if (err) {
        fs.mkdirSync(assets_path);
    }

    app.use(express.static(assets_path));;

});






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
        // outPutLog(log4js,id,"just a test");
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
app.get('/api/getLog', jsonParser, function (req, res) {
    var id = req.query.id;
    if (!id) {
        callBackFailed(res, "no id");
    }
    else {

        var logPath = path.join(__dirname, '/public/', id, "/log/build.log");
        fs.access(logPath, function (err) {
            if (err) {
                return res.json( "获取日志失败");
            }
            var log_stream = fs.createReadStream(logPath)
            log_stream.pipe(res);//todo :出错处理？

        })

    }

});



//下载构建结果
app.get('/api/download', function (req, res) {
    //console.log(req.query.filename);
    var filename = "bundle.zip";
    var id = req.query.id;

    if (!filename) {
        callBackFailed(res, "no filename");
        outPutLog(log4js, id, "下载构建结果失败,未找到bundle.zip!");
    }
    if (!id) {
        callBackFailed(res, "no id");
        outPutLog(log4js, id, "下载构建结果失败,未找到用户id!");
    }

    var filepath = path.resolve(__dirname, 'public', id, 'bundlezip') + '/' + filename;
    //console.log(filepath);
    var stream = fs.createReadStream(filepath)
    stream.pipe(res);//todo :出错处理？

    outPutLog(log4js, id, "下载构建结果成功!");
});

//执行构建
//todo : 构建服务控制接口
app.post('/api/buildBundle', jsonParser, function (req, res) {
    var id = req.query.id;
    var buildType = req.query.buildType;

    outPutLog(log4js, id, "构建发起成功!");

    //开发期构建
    if (buildType == 'develop') {
        var entryfile_path = req.query.entryfile_path;
        var workspace_name = req.query.workspace_name;
        var username = req.query.username;

        if (!entryfile_path) {
            callBackFailed(res, "no entryfile_path");
            return;
        }

        var nectarOutPutPath = path.resolve(__dirname, workspace_name, username, workspace_name, 'target', "nectar", "web", id);

        fs.mkdirSync(nectarOutPutPath);

        var entryPath = "./source/" + workspace_name + "/" + entryfile_path;

        try {
            buildBundle([{ name: 'index', path: entryPath, title: 'index', htmlFileName: 'index.html' }], outPutPath, buildType, id, function () {
                res.json({ state: 200, msg: "success" });
            });

        } catch (error) {

            // outPutLog(log4js, id, "构建失败，请检查代码是否有误，错误信息:" + error);
            //delProject(id);
            res.json({ state: 503 });

        }

    }

    //生产期构建，需要从配置文件中读取入口文件等相关配置
    else {
        var filedir = path.resolve(__dirname, 'public', id, "projectzip"); //压缩包所在文件夹
        var filepath = filedir + '/' + "project.zip"; //压缩文件路径
        var targetDir = path.resolve(__dirname, 'public', id, "project");//解压的目标路径
        unzipfile(filepath, targetDir, function () {

            var entryConfigPath = path.resolve(__dirname, 'public', id, 'project') + '/platform/web.build.config';
            var entryConfig = {};
            entryConfig = JSON.parse(fs.readFileSync(entryConfigPath, 'utf8'));
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

                try {
                    console.log("@@@@@")
                    buildBundle(entries, outPutPath, buildType, id, function () {
                        //
                        res.json({ state: 200 });
                    });

                } catch (error) {
                    console.log("???????")
                    outPutLog(log4js, id, "构建失败，请检查代码是否有误，错误信息:" + error);
                    delProject(id);
                    res.json({ state: 503 });

                }


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
            fs.mkdirSync(outPutPath);
            outPutLog(log4js, id, "获取构建工作空间成功！");
            res.json({ id: id, state: 200 });
        }
    });

});


var callBackFailed = function (res, msg) {
    res.json({ result: "faild", msg: msg });
}



var acServer = app.listen(9000, 300, function () {
    console.log("workspace ac start @" + 9000 + ' [port]');
});


//压缩文件
var zipfile = function (sourcePath, targetPath, id, callback) {
    fs.exists(sourcePath, function (exists) {
        if (exists) {
            fs.lstat(sourcePath, function (err, stat) {
                var archive = archiver('zip');
                archive.on('error', function (err) {
                    //exe_callback(err, null, callback);
                    outPutLog(log4js, id, "压缩文件失败!");
                    return;
                });
                var writeStream = fs.createWriteStream(targetPath);
                archive.pipe(writeStream);
                writeStream.on('close', function (err, data) {
                    //sexe_callback(err, data, callback);
                    status[id] = 2;
                    console.log("#############################", status[id], id)

                });
                writeStream.on('error', function (err, data) {
                    //	exe_callback(err, data, callback);
                    outPutLog(log4js, id, "压缩文件失败，写入流错误!");
                    status[id] = 3;
                    return;
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
            outPutLog(log4js, id, "压缩文件失败，文件不错在!");
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
                    //  console.log("success?")
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
    is_building = true;

    compiler.run(function (err, stats) {
        var options = {
            colors: true
        };

        console.log(stats.toString(options));
        // status[taskId] = -1;
        if (err) {
            outPutLog(log4js, id, "构建出错，请联系管理员!");
            delProject(id);
            return;
        }
        // console.log(err + "======================");
        else {
            outPutLog(log4js, id, "构建成功，准备打包构建结果!");
        }
        var zipPath = path.resolve(__dirname, 'public', id, 'bundlezip');
        var sourcePath = path.resolve(__dirname, 'public', id, 'result');
        fs.access(zipPath, function (err) {
            if (err) {
                fs.mkdir(zipPath);
            }
        });
        var zipFilePath = zipPath + '/bundle.zip';
        zipfile(sourcePath, zipFilePath, id);
        delProject(id);
        callback();

    });



};


var getStatusMsg = function (state) {
    switch (state) {
        case 1: return "building";
        case 2: return "build done";
        case 3: return "build failed";
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
        var logger = log4js.getLogger('BUILD_LOG');

        logger.info(buildLog);
    });

}


//构建完成之后删除解压的工程，防止冲突报错

var delProject = function (id) {
    var delPath = path.resolve(__dirname, "public", id, "project")
    console.log(delPath);
    // var del_cmd = "rm -rf " + delPath;
    // exec(del_cmd, function (err, out) {

    //     console.log(out); err && console.log(err);

    // });
}


/**
 *执行callback
 */
function exe_callback(err, data, callback) {
    if (callback && typeof callback === 'function') {
        callback(err, data);
    }
}