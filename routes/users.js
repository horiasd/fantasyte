const axios = require('axios');
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isLoggedIn } = require('../middleware');
const League = require('../models/league');
const User = require('../models/user');
const catchAsyncErr = require('../utils/catchAsyncError');
const Team = require('../models/team');
const Player = require('../models/player');
const nba = require('../players.json');
const team = require('../models/team');

//Renders login form.
router.get('/login', (req, res) => {
    res.render('user/login');
})

//Renders profile page.
router.get('/profile', isLoggedIn, catchAsyncErr(async (req, res) => {
    const user = res.locals.loggedInUser;
    const leagues = await League.find({creator: user._id});
    const yourInviteOnlyLeagues = await League.find({ users: user._id, leagueType: 'invite', creator: user._id });
    const invitedToLeagues = await League.find( { _id: { $in: user.invitedTo}});
    res.render('user/profile', { user, leagues, yourInviteOnlyLeagues, invitedToLeagues });
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

//Renders admin page.
router.get('/admin', (req, res) => {
    const user = res.locals.loggedInUser;
    if(user === undefined) {
        return res.redirect('/start');
    }
    if(!user.isAdmin) {
        return res.redirect('/start');
    }
    res.render('user/admin');
})


function formatDate(date) {
    let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}

//TODO: it does nothing at the moment
//gets data from api and saves it to the db
router.post('/admin', catchAsyncErr(async(req, res) => {
    //LEHET NEM IS KELL A PLAYER
    await Player.updateMany({},
        {$set: 
            {
                pointsInLastGame: 0,
                assistsInLastGame: 0,
                reboundsInLastGame: 0,
                stealsInLastGame: 0,
                blocksInLastGame: 0
            }
        }    
    )
    //FIXME: change date
    const today = new Date()
    const yesterday = new Date(today)

    yesterday.setDate(yesterday.getDate() - 1)
    
    const dateYesterdayFormatted = formatDate(yesterday);

    
    const result = await axios.request( {
        method: 'GET',
        url: 'https://api-nba-v1.p.rapidapi.com/games/date/' + dateYesterdayFormatted,
        headers: {
            'x-rapidapi-key': 'yourapikey',
            'x-rapidapi-host': 'api-nba-v1.p.rapidapi.com'}
    });
    const games = await result.data.api.games;
    const gameIDs = [];
    for (let game of games) {
        gameIDs.push(game.gameId);
    }
    const stats = [];
    for (let gameID of gameIDs) {
        const res2 = await axios({
            method: 'GET',
            url: `https://api-nba-v1.p.rapidapi.com/statistics/players/gameId/${gameID}`,
            headers: {
                'x-rapidapi-key': 'yourapikey',
                'x-rapidapi-host': 'api-nba-v1.p.rapidapi.com'
            }
        });
        for (let stat of res2.data.api.statistics) {
            stats.push(stat);
        }
    }
    
    const playersThatPlayed = [];

    for (let stat of stats) {
        for (let i = 0; i < 50; i++) {
            if (stat.playerId == nba.players[i].playerId) {
                playersThatPlayed.push(stat);
            }
        }
    }
    //lehet nem is kell a players-t db-ben tárolni!!
    //playersThatPlayed contains the players data -> update db with it
    //console.log(playersThatPlayed);
    
    const teams = await Team.find({});
    for(let i = 0; i < teams.length; i++) {
        //ha nem jo akkor i=0 i<5 i++
        let points = 0;
        for(let player of teams[i].playerNames) {
            //valszeg lehet sokkal egyszerűbben
            //kövi 15 sor ?????? jó?? nem ??? who knows
            console.log(player);
            let j = 0;
            while(player !== nba.players[j].name) {
                j++;
            }
            const playerID = nba.players[j].playerId;
            const specificPlayer = playersThatPlayed.filter(p => p.playerId == playerID);  
            if(specificPlayer.length !== 0) {
                console.log('hex');
                
                points = parseInt(specificPlayer[0].points) +
                    parseInt(specificPlayer[0].tpm) -
                    parseInt(specificPlayer[0].fga) +
                    parseInt(specificPlayer[0].fgm) * 2 -
                    parseInt(specificPlayer[0].fta) +
                    parseInt(specificPlayer[0].ftm) +
                    parseInt(specificPlayer[0].assists) * 2 +
                    parseInt(specificPlayer[0].totReb) +
                    parseInt(specificPlayer[0].steals) * 4 +
                    parseInt(specificPlayer[0].blocks) * 4 -
                    parseInt(specificPlayer[0].turnovers) * 2;
                console.log(points);
                const teamID = teams[i]._id;
                await Team.updateOne({_id: teamID}, { $inc: {weeklyPoints: points}});    
            }
        }
    }
    res.redirect('/admin');
}))

//Closes weekly matchups.
//TODO: in theory it works but TEST IT!!!
router.put('/admin', catchAsyncErr(async(req, res) => {
    const leagues = await League.find({});
    for(let league of leagues) {
        const teams = await Team.find({ _belongsToLeague: league._id});
        const teamsInOrder = teams.sort(compare);
        
        for(let i = 0; i < teamsInOrder.length; i++) {
            let leagueId = teamsInOrder[i]._belongsToLeague;
            let userId = teamsInOrder[i]._belongsToUser;
            let incPoints = (teamsInOrder.length - i) * 2;
            
            await Team.updateOne(
                { _belongsToUser: userId, _belongsToLeague: leagueId}, 
                { $inc: { points: incPoints }, $set: { weeklyPoints: 0 } }
            );   
        }
    }
    res.redirect('/admin');
}))

function compare( a, b ) {
    if ( a.weeklyPoints > b.weeklyPoints ){
      return -1;
    }
    if ( a.weeklyPoints < b.weeklyPoints ){
      return 1;
    }
    return 0;
  }


//Logs out user.
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Logged you out!');
    res.redirect('/start');
})

//TODO: it does nothing at the moment
//Ends season
router.post('/endseason', catchAsyncErr(async(req, res) => {
    const leagueId  = req.body.leagueid;
    await League.updateOne( {_id: leagueId}, 
        { $set: {seasonEnded: true} }
    );

    res.redirect(`/league/${leagueId}`);
}))

module.exports = router;
