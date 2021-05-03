const db = require('./db');
const sha = require('sha1');
const crypto = require('crypto');

const key = crypto.scryptSync('sgnilo', 'xjp142065', 24);
const iv = crypto.randomBytes(16);

const result = (errMsg, errno = 0) => ({errMsg, errno});

const encrypt = data => {
    const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
    let crypted = cipher.update(data, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

const decrypt = encrypted => {
    const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const auth = (req, res) => {
    const {token} = req.cookies;
    if (token) {
        const {time, name} = JSON.parse(decrypt(token));
        if (time && name && time >= new Date().getTime()) {
            return name;
        }
    }
    res.send(JSON.stringify(result('身份鉴权失败，请重新登录！', 3)));
};

const makeToken = (req, res, name) => {
    const time = new Date().getTime() + 300000;
    const token = encrypt(JSON.stringify({time, name}));
    res.cookie('token', token);
};


const register = (req, res) => {
    const {name, psd} = req.query;
    if (name && psd) {
        db.command(`SELECT * from usertbl WHERE user_name = "${name}"`, (err, rows) => {
            if (!err) {
                if (rows[0]) {
                    res.send(result('该昵称已被占用！', 2));
                } else {
                    db.command(`INSERT INTO usertbl (user_name, user_psd, product_list) VALUES ("${name}", "${sha(psd)}", "[]");`, (err, rows, fields) => {
                        if (!err) {
                            makeToken(req, res, name);
                            res.send(JSON.stringify(result('注册成功！')));
                        } else {
                            res.send(JSON.stringify(result('注册失败！', 1)));
                        }
                    });
                }
            } else {
                res.send(JSON.stringify(result('注册失败！', 1)));
            }
        });
    } else {
        res.send(JSON.stringify(result('名称或密码未完善！', 1)));
    }
};

const home = (req, res) => {
    console.log(req.cookies);
    res.send('这是主页');
};

const url = {};

url['/register'] = {
    method: 'get',
    inWhiteList: true,
    callback: register
};

url['/'] = {
    method: 'get',
    inWhiteList: true,
    callback: home
}

module.exports = {
    url,
    auth,
    makeToken
}
