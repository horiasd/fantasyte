const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isLoggedIn } = require('../middleware');
const League = require('../models/league');
const User = require('../models/user');
const catchAsyncErr = require('../utils/catchAsyncError');

//Renders login form.
router.get('/login', (req, res) => {
    res.render('user/login');
})

//Renders profile page.
router.get('/profile', isLoggedIn, catchAsyncErr(async (req, res) => {
    const user = res.locals.loggedInUser;
    const leagues = await League.find({ users: user._id, leagueType: 'invite', creator: user._id });
    const invitedToLeagues = await League.find( { _id: { $in: user.invitedTo}});
    res.render('user/profile', { user, leagues, invitedToLeagues });
}))

//Invites player to an invite only league.
router.put('/profile', isLoggedIn, catchAsyncErr(async (req, res) => {
    const username = req.body.username;
    const leagueid = req.body.leagueid;
    await User.updateOne(
        { username: username }, 
        { $push: { invitedTo: leagueid } }
    );    
    res.redirect('/start');
}))

//User accepts invited -> database updated.
router.post('/profile', isLoggedIn, catchAsyncErr(async (req, res) => {
    const user = res.locals.loggedInUser;
    const leagueid = req.body.leagueid;
    console.log(User);
    await User.updateOne({ _id: user._id}, {$pull: { invitedTo: leagueid}},
        {$push: {leagues: leagueid}});
    console.log(User);
    await League.updateOne({_id: leagueid}, { $push: { users: user._id}});
    res.redirect('/league');
}))

//Logs in user.
router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: 'Invalid username or password.' }), (req, res) => {
    req.flash('success', 'Successfully logged in!');
    res.redirect('/start');
})

//Renders registration form.
router.get('/register', (req, res) => {
    res.render('user/register');
})

//Creates new user & logs them in.
router.post('/register', catchAsyncErr(async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Successfully registered!');
            res.redirect('/start');
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
}))

router.get('/admin', (req, res) => {
    res.render('user/admin');
})

//Logs out user.
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Logged you out!');
    res.redirect('/start');
})

//Renders forgottenpassword.
router.get('/forgottenpassword', (req, res) => {
    res.render('user/forgottenpassword');
})

module.exports = router;