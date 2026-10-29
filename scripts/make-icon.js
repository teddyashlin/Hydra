'use strict';
const fs = require('fs');
const path = require('path');
const { dropPng } = require('../src/drop-icon');

const out = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, dropPng(256));
console.log('Wrote', out);
