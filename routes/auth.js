const express = require('express');
const ExpressError = require('../expressError');
const User = require('../models/user');
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

const router = new express.Router();

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post('/login', async (req,res,next) => {
    try {
        const {username, password } = req.body;
        if (!username || !password) {
            throw new ExpressError('Invalid credentials', 400);
        };
        const auth = await User.authenticate(username,password);
        if (auth) {
            await User.updateLoginTimestamp(username);
            const token = jwt.sign({username},SECRET_KEY,{expiresIn: 60*60});
            return res.json({token});
        } else {
            throw new ExpressError('Invalid credentials', 400);
        };
    } catch(err) {
        return next(err);
    };
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async (req,res,next) => {
    try {
        const user = await User.register(req.body);
        const token = jwt.sign({username: user.username},SECRET_KEY,{expiresIn: 60 * 60});
        return res.json({token});
    } catch(err) {
        return next(err);
    };
});

module.exports = router;