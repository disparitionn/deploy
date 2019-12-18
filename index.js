'use strict';

const Client = require('ssh2-sftp-client');
const config = require('./config.js');
const fs = require('fs');
let path = require('path');

const remoteDir = config.remoteDir;
const localDir = config.localDir;
const defaultConfig = config.defaultConfig;
const filesOrder = config.filesOrder;

let files = [];
let lowPriorityFiles = [];


const filePriority = (file) => {
    lowPriorityFiles = JSON.parse(filesOrder);
    console.log(lowPriorityFiles)

    /*if (filesOrder.find(file)){
        lowPriorityFiles.push(file)
    }*/

    return lowPriorityFiles;
};

let bypass = function (dir, done, rootPath) {
    filePriority()
    let results = [];
    rootPath = rootPath || `${__dirname}/${dir}/`;
    rootPath = rootPath.replace(/\/deploy/g, '');
    fs.readdir(dir, function (err, list) {
        if (err) {
            return done(err);
        }
        let pending = list.length;
        if (!pending) {
            return done(null, results);
        }
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    bypass(file, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    }, rootPath);
                } else {
                    results.push(file.replace(rootPath, ''));
                    if (!--pending) {
                        done(null, results);
                    }
                }
            });
        });
    });
};

bypass(localDir, function (err, results) {
    if (err) throw err;
    files = results;
});



const upload = () => {
    return new Promise(async (resolve, reject) => {
        let i = files.length - 1;
        const isFolderCreated = {};

        for (; i >= 0; i--) {
            try {
                let locpath = `${localDir}/${files[i]}`;
                let rempath = `${remoteDir}/${files[i]}`;

                let fileDir = path.dirname(rempath);
                if (!isFolderCreated[fileDir]) {
                    const results = await createDirIfNotExist(fileDir);
                    isFolderCreated[fileDir] = true;
                    console.log(results);
                }
                await sftp.put(locpath, rempath, {flag: 'w'});
                console.log(files[i], ': UPLOADED');
            } catch (e) {
                console.log(files[i], ': ERROR', e)
            }
        }
        resolve()
    })
};

function createDirIfNotExist(path) {
    return new Promise((resolve, reject)=>{
        sftp.exists(path + '/').then(result =>{
            if (!!result) {
                return resolve(`${path} exists`)
            }
            sftp.mkdir(path, true)
                .then(resolve)
                .catch(reject)
        }).catch(reject)
    });
}

const sftp = new Client();
(async () => {
    try {
        await sftp.connect(defaultConfig);
        const p = await sftp.cwd();
        console.log(`Remote working directory is ${p}`);
        //await upload();
        await sftp.end();
        console.log('------------Deploy was completed------------');
    } catch (e) {
        console.log(`ERROR: ${e.message}`);
    }
})();
