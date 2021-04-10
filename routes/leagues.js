const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const League = require('../models/league');
const User = require('../models/user');
const { isLoggedIn, validateLeague } = require('../middleware');
const catchAsyncErr = require('../utils/catchAsyncError');
const nba = require('../players.json');

//Renders join league page.
router.get('/join', isLoggedIn, catchAsyncErr(async (req, res) => {
    const id = res.locals.loggedInUser._id;
    const leagues = await League.find({ 'users': { '$ne': id } });
    res.render('league/joinleague', { leagues });
}))

//User joins league.
router.post('/join', isLoggedIn, catchAsyncErr(async (req, res) => {
    const { id } = req.body;
    const league = await League.findById(id);
    const user = res.locals.loggedInUser;
    if (league.users.includes(user._id)) {
        req.flash('error', 'You already joined this league!');
        return res.redirect('/league/join');
    }
    if (!league) {
        req.flash('error', 'Cannot join this league!');
        return res.redirect('/league/join');
    }
    league.users.push(res.locals.loggedInUser._id);
    await league.save();
    req.flash('success', 'Successfully joined the league!');
    res.redirect(`/league/${id}`);
}))

//Renders new league form.
router.get('/new', isLoggedIn, (req, res) => {
    res.render('league/newleague');
})

//Displays specific league.
router.get('/:id', isLoggedIn, catchAsyncErr(async (req, res) => {
    const id = req.params.id;
    const userId = res.locals.loggedInUser._id;
    const isValid = mongoose.Types.ObjectId.isValid(id);
    if (!isValid) {
        req.flash('error', 'Cant find that league.');
        return res.redirect(`/league`);
    }
    const league = await League.findById(id);
    if (!league) {
        req.flash('error', 'Cant find that league.');
        return res.redirect(`/league`);
    }

    if(league.draftHappened === false) {
        const indexOfUser = league.users.indexOf(userId);
        const timeFromDB = league.draftTime;
        const diffToBeginning = indexOfUser * 2;
        const diffToEnding = (indexOfUser * 2) + 2;
        const draftWindowBeginning = new Date(timeFromDB.getTime() + diffToBeginning*60000);
        const draftWindowEnding = new Date(timeFromDB.getTime() + diffToEnding*60000);
        

        //ezt ki kéne szervezni egy függvénybe
        const niceDraftTimeFormat = league.draftTime.getFullYear() + '.' 
                                    +(league.draftTime.getMonth() +1).toString()  + '.' 
                                    +league.draftTime.getDate()     + '. '
                                    +league.draftTime.getHours()   + ':'
                                    +league.draftTime.getMinutes();

        const niceFormatB = draftWindowBeginning.getFullYear() + '.' 
                            +(draftWindowBeginning.getMonth() + 1).toString()   + '.' 
                            +draftWindowBeginning.getDate()     + '. '
                            +draftWindowBeginning.getHours()   + ':'
                            +draftWindowBeginning.getMinutes();

        const niceFormatE = draftWindowEnding.getFullYear() + '.'
                            +(draftWindowEnding.getMonth() + 1).toString()   + '.'
                            +draftWindowEnding.getDate()     + '. '
                            +draftWindowEnding.getHours()   + ':'
                            +draftWindowEnding.getMinutes();
        res.render('league/openedleague', { league, niceDraftTimeFormat, niceFormatB, niceFormatE });
    }
    else{
        res.render('league/openedleague', { league });
    }
}))

//Renders draft, if its the loggedin users time to draft.
router.get('/:id/draft', isLoggedIn, catchAsyncErr(async(req, res) => {
    const id = req.params.id;
    const userId = res.locals.loggedInUser._id;
    const isValid = mongoose.Types.ObjectId.isValid(id);
    if(!isValid) {
        req.flash('error', 'Cant find that league.');
        return res.redirect(`/league`);
    }
    
    const league = await League.findById(id);
    const user = await User.findById(userId);

    const indexOfUser = league.users.indexOf(userId);
    let roundCounter = league.roundCount;
    //TODO: ezt tesztelni itten, asszem az 5 jó itt de ez nem 100% -> így mindenkinek 5 játékosa lesz,
    //lehet több kéne, játékosok számától függ amit az apiból szedek
    if(roundCounter === 5) {
        await League.updateOne(
            { _id: id }, 
            { $set: { draftHappened: true } }
        );
        return res.redirect(`/league/${id}`);
    }
    
    console.log('roundCount: ', roundCounter);
    if(!league) {
        req.flash('error', 'Cant find that league.');
        return res.redirect(`/league`);
    }
    
    const timeFromDB = league.draftTime;
    const diffToBeginning = indexOfUser * 2;
    const diffToEnding = (indexOfUser * 2) + 2;
    const draftWindowBeginning = new Date(timeFromDB.getTime() + diffToBeginning*60000);
    const draftWindowEnding = new Date(timeFromDB.getTime() + diffToEnding*60000);
    
    const currentDateTime = new Date();
    
    if(currentDateTime < league.draftTime) {
        req.flash('error', 'Draft will take place later!');
        return res.redirect(`/league/${id}`);
    }
    if(draftWindowBeginning <= currentDateTime && currentDateTime < draftWindowEnding) {
        if(indexOfUser === league.users.length - 1) {
            roundCounter += 1;
            await League.updateOne(
                { _id: id }, 
                { $set: { roundCount: roundCounter } }
            );
        }
        res.render('league/draft', { league, user, nba, indexOfUser, draftWindowBeginning, draftWindowEnding });
    }
    else{
        req.flash('error', 'Someone else is drafting now!');
        return res.redirect(`/league/${id}`)
    }
}))

//Adds player to users team.
router.post('/:id/draft', isLoggedIn, catchAsyncErr(async(req, res) => {
    
}))

//Displays your team in specific league.
router.get('/:id/team', isLoggedIn, (req, res) => {
    res.render('league/team');
})

//Lists joined leagues
router.get('/', isLoggedIn, catchAsyncErr(async (req, res) => {
    const id = res.locals.loggedInUser._id;
    const leagues = await League.find({ users: id });
    res.render('league/yourleagues', { leagues });
}))

//Create league post route.
router.post('/', isLoggedIn, validateLeague, catchAsyncErr(async (req, res, next) => {
    const league = new League(req.body.league);
    const user = res.locals.loggedInUser;
    league.creator = res.locals.loggedInUser._id;
    league.users.push(user._id);
    await league.save();
    //FIXME:ez nem kell ide??????????????????????????
    //user.invitedTo.push(league._id);
    //await user.save();
    req.flash('success', 'Successfully created a new league!');
    res.redirect(`/league/${league._id}`);
}))

module.exports = router;