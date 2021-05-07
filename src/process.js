const db = require('./db');
const sha = require('sha1');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const util = require('./util');
const cache = require('./cache');

const chain = require('blockchain-xjp');
console.log(chain);


const setAllwhileAble = list => {
    setTimeout(() => {
        console.log('正在将数据存入区块链')
        const block = chain.addBlock(list);
        block.then(res => {
            console.log('是否存入成功？', res);
            if (res.status) {
                const {head, height} = res.block;
                list.forEach(item => {
                    const {productId, userName, userId} = item;
                    const data = {userName, head, height, hasBlock: true};
                    db.command(`UPDATE producttbl SET product_block='${JSON.stringify(data)}' WHERE product_id = "${productId}"`);
                    db.command(`INSERT INTO actions (user_id, time, event, action_type) VALUES (${userId}, '${new Date().getTime()}', '生成新版权', 2)`);
                });
            }
        }).catch(err => console.log('出错了', err));
    }, 10000);
};

db.command(`SELECT * from producttbl`, (err, data) => {
    if (!err) {
        data.forEach(item => {
            const {product_block, product_master, product_name, product_disc, product_file, product_id} = item;
            if (!JSON.parse(product_block).hasBlock) {
                db.command(`SELECT * from usertbl WHERE user_id = ${product_master}`, (err, rows) => {
                    if (!err && rows[0]) {
                        const {user_name} = rows[0];
                        const arr = cache.getCache('productList') || [];
                        arr.push({
                            productId: product_id,
                            userId: product_master,
                            userName: user_name,
                            productName: product_name,
                            productDesc: product_disc,
                            productMd5: util.computMd5(product_file)
                        });
                        if (arr.length >= 5) {
                            cache.setCache('productList', []);
                            setAllwhileAble(arr);
                        } else {
                            cache.setCache('productList', arr);
                        }
                    }
                });
            }
        });
    }
});

const key = crypto.scryptSync('sgnilo', 'xjp142065', 24);
const iv = crypto.randomBytes(16);

const result = (errMsg, errno = 0, data) => ({errMsg, errno, ...{data}});

const upload = multer({dest: path.resolve(__dirname, 'file')});

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
        try {
            const {time, name} = JSON.parse(decrypt(token));
            if (time && name && time >= new Date().getTime()) {
                return name;
            }
        } catch (e) {};
    }
    res.send(JSON.stringify(result('身份鉴权失败，请重新登录！', 3)));
};

const makeToken = (req, res, name) => {
    const time = new Date().getTime() + 300000;
    const data = JSON.stringify({time, name});
    const token = encrypt(data);
    res.cookie('token', token);
};


const register = (req, res) => {
    const {name, psd} = req.body;
    if (name && psd) {
        db.command(`SELECT * from usertbl WHERE user_name = "${name}"`, (err, rows) => {
            if (!err) {
                if (rows[0]) {
                    res.send(result('该昵称已被占用！', 2));
                } else {
                    const time = new Date().getTime();
                    db.command(`INSERT INTO usertbl (user_name, user_psd, product_list, register_time) VALUES ("${name}", "${sha(psd)}", "[]", "${time}");`, (err, data, fields) => {
                        if (!err) {
                            makeToken(req, res, name);
                            const {insertId} = data;
                            db.command(`INSERT INTO actions (user_id, time, event, action_type) VALUES (${insertId}, "${time}", "注册", 1);`, (err, resu) => {
                                if (!err) {
                                    res.send(JSON.stringify(result('注册成功！', 0, {username: name})));
                                } else {
                                    res.send(JSON.stringify(result('注册失败！', 1)));
                                }
                            });
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

const login = (req, res) => {
    const {name, psd} = req.body;
    if (name && psd) {
        db.command(`SELECT * from usertbl WHERE user_name = "${name}"`, (err, rows) => {
            if (!err) {
                if (rows && rows[0]){
                    if (rows[0].user_name === name && rows[0].user_psd === sha(psd)) {
                        makeToken(req, res, name);
                        res.send(JSON.stringify(result('登陆成功', 0, {username: name})));
                    } else {
                        res.send(JSON.stringify(result('用户名或密码错误！', 4)))
                    }
                } else {
                    res.send(JSON.stringify(result('不存在该用户！', 6)))
                }
            } else {
                res.send(JSON.stringify(result('登陆失败！', 5)));
            }
        });
    } else {
        res.send(JSON.stringify(result('名称或密码未完善！', 1)));
    }
};

const verifyPsd = (req, res, name) => {
    const {psd} = req.body;
    if (psd) {
        db.command(`SELECT * from usertbl WHERE user_name = "${name}"`, (err, rows) => {
            if (!err) {
                if (rows && rows[0]){
                    if (rows[0].user_name === name && rows[0].user_psd === sha(psd)) {
                        res.send(JSON.stringify(result('验证成功', 0, {username: name})));
                    } else {
                        res.send(JSON.stringify(result('密码错误！', 4)))
                    }
                } else {
                    res.send(JSON.stringify(result('不存在该用户！', 6)))
                }
            } else {
                res.send(JSON.stringify(result('验证失败！', 5)));
            }
        });
    } else {
        res.send(JSON.stringify(result('密码未完善！', 1)));
    }
};

const changePsd = (req, res, name) => {
    const {psd} = req.body;
    if (psd) {
        db.command(`UPDATE usertbl SET user_psd='${sha(psd)}' WHERE user_name = "${name}"`, (err, rows) => {
            if (!err) {
                console.log(rows);
                res.send(JSON.stringify(result('修改成功')))
            } else {
                res.send(JSON.stringify(result('修改失败！', 5)));
            }
        });
    } else {
        res.send(JSON.stringify(result('新密码未完善！', 1)));
    }
};

const getUserInfo = (req, res, name) => {
    db.command(`SELECT * from usertbl WHERE user_name = "${name}"`, (err, rows) => {
        if (!err) {
            if (rows && rows[0]){
                delete rows[0].user_psd;
                const {user_id} = rows[0];
                db.command(`SELECT * from producttbl WHERE product_master = "${user_id}"`, (err, products) => {
                    if (!err) {
                        if (products){
                            db.command(`SELECT * from actions WHERE user_id = "${user_id}"`, (err, actions) => {
                                if (!err) {
                                    actions.sort((a, b) => parseInt(b.time) - parseInt(a.time));
                                    const product_list = products.map(item => ({...item, product_file: util.computMd5(item.product_file)}));
                                    const data = {...rows[0], product_list, actions};
                                    res.send(JSON.stringify(result('获取成功', 0, data)));
                                } else {
                                    res.send(JSON.stringify(result('用户行为列表获取失败！', 5)));
                                }
                            });
                        } else {
                            res.send(JSON.stringify(result('不存在该用户！', 6)))
                        }
                    } else {
                        res.send(JSON.stringify(result('获取版权列表失败！', 5)));
                    }
                });
            } else {
                res.send(JSON.stringify(result('不存在该用户！', 6)))
            }
        } else {
            res.send(JSON.stringify(result('获取用户信息失败！', 5)));
        }
    });
};

const getProductListByName = (req, res) => {
    const {name} = req.query;
    if (name) {
        db.command(`SELECT * from producttbl WHERE product_name LIKE "%${name}%" OR product_disc LIKE "%${name}%"`, (err, row) => {
            if (!err) {
                const data = row.map(item => ({...item, product_file: util.computMd5(item.product_file), block: JSON.parse(item.product_block)})).filter(item => item.block.hasBlock);
                res.send(JSON.stringify(result('获取成功！', 0, data)));
            } else {
                res.send(JSON.stringify(result('获取失败！', 8)))
            }
        });
    } else {
        res.send(JSON.stringify(result('名称未完善！', 8)))
    }
};

const uploadProduct = (req, res, name) => {
    const {productName, productDesc} = req.body;
    const file = req.file;
    const newFilePath = path.resolve(__dirname, 'file/' + file.originalname);
    fs.renameSync(file.path, newFilePath);
    const fileMd5 = util.computMd5(newFilePath);

    db.command(`SELECT * from usertbl WHERE user_name = "${name}"`, (err, data) => {
        if (err || !data[0]) {
            res.send(JSON.stringify(result('版权生成失败', 8)));
        } else {
            const {user_id} = data[0];
            const block = {
                hasBlock: false
            }
            console.log('ok still');
            db.command(`INSERT INTO producttbl (product_name, product_disc, product_file, product_master, product_block) VALUES ("${productName}", "${productDesc}", "${newFilePath}", ${user_id}, '${JSON.stringify(block)}');`, (err, row) => {
                if (!err) {
                    res.send(JSON.stringify(result('版权文件上传成功，请等待生成版权！')));
                    const {insertId} = row;
                    const productList = cache.getCache('productList') || [];
                    productList.push({
                        productId: insertId,
                        userId: user_id,
                        userName: name,
                        productName,
                        productDesc,
                        productMd5: fileMd5
                    });
                    if (productList.length >= 5) {
                        cache.setCache('productList', []);
                        setAllwhileAble(productList);
                    } else {
                        cache.setCache('productList', productList);
                    }
                } else {
                    console.log(err);
                    res.send(JSON.stringify(result('版权生成失败', 8)));
                }
            });
        }
    });
};


const url = {};

url['/register'] = {
    method: 'post',
    inWhiteList: true,
    callback: register
};

url['/'] = {
    method: 'get',
    inWhiteList: true,
    callback: home
}

url['/login'] = {
    method: 'post',
    inWhiteList: true,
    callback: login
}

url['/verifypsd'] = {
    method: 'post',
    callback: verifyPsd
}

url['/updatepsd'] = {
    method: 'post',
    callback: changePsd
}

url['/getuserinfo'] = {
    method: 'get',
    callback: getUserInfo
}

url['/uploadproduct'] = {
    method: 'post',
    preProcess: upload.single('productFile'),
    callback: uploadProduct
}

url['/getproductlist'] = {
    method: 'get',
    inWhiteList: true,
    callback: getProductListByName
}

module.exports = {
    url,
    auth,
    makeToken
}

