const express = require('express');
const Message = require('../models/message');
const { ensureLoggedIn }= require('../middleware/auth');
const ExpressError = require('../expressError');

const router = new express.Router();

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get('/:id', ensureLoggedIn, async (req,res,next) => {
    try {
        const message = await Message.get(req.params.id);
        if (req.user.username != message.to_user.username && req.user.username != message.from_user.username) {
            throw new ExpressError('Unauthorized', 401);
        } else {
            return res.json({message});
        }
    } catch(err) {
        return next(err);
    };
});


/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async (req,res,next) => {
    const { to_username, body } = req.body;
    const response = await Message.create({from_username: req.user.username,to_username,body});
    await Message.sendSMS(to_username);
    return res.json({message: response});
});


/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async (req,res,next) => {
    try {
        const { id } = req.params;
        const { to_user } = await Message.get(id);
        if (req.user.username == to_user.username) {
            const response = await Message.markRead(id);
            return res.json(response);
        } else {
            throw new ExpressError('Unauthorized', 401);
        }
    } catch(err) {
        next(err);
    };
});

module.exports = router;