const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const League = require('../models/league');
const User = require('../models/user');
const Team = require('../models/team');
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
    const userId = res.locals.loggedInUser._id;
    
    const league = await League.findById(id);
    
    if (league.users.includes(userId)) {
        req.flash('error', 'You already joined this league!');
        return res.redirect('/league/join');
    }
    if (!league) {
        req.flash('error', 'Cannot join this league!');
        return res.redirect('/league/join');
    }
    league.users.push(userId);
    await league.save();
    const team = new Team({_belongsToUser: userId, _belongsToLeague: id});
    await team.save();
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
    const team = await Team.findOne({_belongsToLeague: id, _belongsToUser: userId});
    
    if (!league) {
        req.flash('error', 'Cant find that league.');
        return res.redirect(`/league`);
    }
    //console.log(league);
    //console.log(team);
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
        res.render('league/openedleague', { league, team, niceDraftTimeFormat, niceFormatB, niceFormatE });
    }
    else{
        res.render('league/openedleague', { league, team });
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
    const team = await Team.findOne( {_belongsToUser: userId, _belongsToLeague: id});

    const indexOfUser = league.users.indexOf(userId);
    let roundCounter = league.roundCount;
    
    if(roundCounter === 5) {
        await League.updateOne(
            { _id: id }, 
            { $set: { draftHappened: true } }
        );
        return res.redirect(`/league/${id}`);
    }
    
    if(!league) {
        req.flash('error', 'Cant find that league.');
        return res.redirect(`/league`);
    }
    if(team.playerNames.length > roundCounter) {
        req.flash.error('You already drafted this round!');
        return res.redirect(`/league/${id}`);
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

        let players = [];
        for(let i = 0; i < 50; i++ ) {
            if(!league.draftedPlayers.includes(nba.players[i].name)) {
                players.push(nba.players[i].name);
            }
        }

        //res.render('league/draft', { league, user, nba, indexOfUser, draftWindowBeginning, draftWindowEnding });
        res.render('league/draft', { league, user, players, indexOfUser, draftWindowBeginning, draftWindowEnding });
    }
    else{
        req.flash('error', 'Someone else is drafting now!');
        return res.redirect(`/league/${id}`);
    }
}))

//Adds player to users team.
router.post('/:id/draft', isLoggedIn, catchAsyncErr(async(req, res) => {
    const playerName = req.body.playerName;
    const leagueId = req.params.id;
    const userId = res.locals.loggedInUser._id;

    await Team.updateOne(
        { _belongsToUser: userId, _belongsToLeague: leagueId}, 
        { $push: { playerNames: playerName } }
    );
    await League.updateOne(
        {_id: leagueId},
        {$push: { draftedPlayers: playerName }}
    );
    return res.redirect(`/league/${leagueId}`);
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
    const userId = res.locals.loggedInUser._id;
    league.creator = userId;
    league.users.push(userId);
    await league.save();
    const id = league._id;
    const team = new Team({_belongsToUser: userId, _belongsToLeague: id});
    await team.save();
    //FIXME:ez nem kell ide??????????????????????????
    //user.invitedTo.push(league._id);
    //await user.save();
    req.flash('success', 'Successfully created a new league!');
    res.redirect(`/league/${league._id}`);
}))

module.exports = router;