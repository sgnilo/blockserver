const crypto = require('crypto');
const fs = require('fs');

const computMd5 = filePath => {
    let md5Str = '';
    let content = Buffer.alloc(5000);
    let current = 0;
    let size = 0;
    const fd = fs.openSync(filePath);
    while (fs.readSync(fd, content, 0, 5000, current)) {
        current += 5000;
        size += content.length;
        md5Str += crypto.createHash('md5').update(content).digest('hex');
        content = Buffer.alloc(5000);
    }
    fs.closeSync(fd);

    return crypto.createHash('md5').update(md5Str).digest('hex');
};

module.exports = {
    computMd5
};