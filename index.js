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
let indexedInfo = {};

const bypass = (dir, done, rootPath) => {
    let results = [];
    rootPath = rootPath || `${__dirname}/${dir}/`;
    rootPath = rootPath.replace(/\/deploy/g, '');
    fs.readdir(dir,  (err, list) => {
        if (err) {
            return done(err);
        }
        let pending = list.length;
        if (!pending) {
            return done(null, results);
        }
        list.forEach((file) => {
            file = path.resolve(dir, file);
            fs.stat(file, (err, stat) => {
                if (stat && stat.isDirectory()) {
                    bypass(file, (err, res) => {
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

bypass(localDir,  (err, results) => {
    if (err) throw err;
    files = results;
});

const createDirIfNotExist = (path) => {
    return new Promise((resolve, reject) => {
        sftp.exists(path + '/').then(result => {
            if (!!result) {
                return resolve(`${path} exists`)
            }
            sftp.mkdir(path, true)
                .then(resolve)
                .catch(reject)
        }).catch(reject)
    });
};

const isLowPriority = (filesOrder) => {
    const result = {};
    Object.values(filesOrder.files).forEach((arr)=>{
        arr.forEach((path)=>{
            result[path] = true;
        })
    })
};
//todo
const indexingFiles = () => {
    return;
}

const filePriority = () => {
    return;
};

const upload = () => {
    indexingFiles();
    return new Promise(async (resolve, reject) => {
        let i = files.length - 1;
        const isFolderCreated = {};

        for (; i >= 0; i--) {
            if (!isLowPriority(files[i], indexedInfo)) {
                continue;
            }
            try {
                let localPath = `${localDir}/${files[i]}`;
                let remotePath = `${remoteDir}/${files[i]}`;

                let fileDir = path.dirname(remotePath);
                if (!isFolderCreated[fileDir]) {
                    const results = await createDirIfNotExist(fileDir);
                    isFolderCreated[fileDir] = true;
                    console.log(results);
                }
                await sftp.put(localPath, remotePath, {flag: 'w'});
                console.log(files[i], ': UPLOADED');
            } catch (e) {
                console.log(files[i], ': ERROR', e)
            }
        }

        resolve()
    })
};


const sftp = new Client();
(async () => {
    try {
        await sftp.connect(defaultConfig);
        const p = await sftp.cwd();
        console.log(`Remote working directory is ${p}`);
        await upload();
        await sftp.end();
        console.log('------------Deploy was completed------------');
    } catch (e) {
        console.log(`ERROR: ${e.message}`);
    }
})();
