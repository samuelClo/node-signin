const mongoose = require('mongoose')
const Schema = mongoose.Schema

const createToken = sizeToken => {
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    const b = [];

	for (let i = 0 ; i < sizeToken ; i++) {
        let j = (Math.random() * (a.length-1)).toFixed(0);

        b[i] = a[j];
	}
    return b.join("");
}

const tokenSchema = new Schema({
    label: {
        type: String,
        required: false,
        default: createToken(10),
        createdAt: new Date,
        index: { expires: 60*1 },
    },
    userId: {
        type: String,
        required: true,
        expireAfterSeconds: 1,
        index: { expires: 60*1 },
    },
}, { collection: 'tokens' })


const Token = mongoose.model('Token', tokenSchema)
module.exports = Token