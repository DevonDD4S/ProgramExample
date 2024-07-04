import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
    googleID:String,
    username:String,
    email:String,
}, { timestamps: true });

const User = model('email', userSchema);

export default User;
