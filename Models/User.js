const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    isConfirm: {
        type: Boolean,
        default: false,
        required: false,
    },
}, { collection: 'users' })

userSchema.methods.validPassword = function(password) {
    return this.password === password
}
userSchema.methods.validEmail = function(email) {
    return this.email === email
}

const User = mongoose.model('User', userSchema)
module.exports = User