const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const User = require('./models/user');
const League = require('./models/league');
const session = require('express-session');
const passport = require('passport');
const Local = require('passport-local');
const ExpressError = require('./utils/ExpressError');
const flash = require('connect-flash');

const leagueRoutes = require('./routes/leagues');
const userRoutes = require('./routes/users');
const catchAsyncError = require('./utils/catchAsyncError');

mongoose.connect('mongodb://localhost:27017/fantasyte', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => {
    console.log('database connected');
})

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'static')));

const sessionConf = {
    secret: 'titkostitok',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httponly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}
app.use(session(sessionConf));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new Local(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.successMsg = req.flash('success');
    res.locals.errorMsg = req.flash('error');
    res.locals.loggedInUser = req.user;
    next();
})

app.use('/', userRoutes);
app.use('/league', leagueRoutes);

//Renders starting page. If user logged in displays extra info.
app.get('/start', catchAsyncError(async (req, res) => {
    if (req.user) {
        const id = req.user._id;
        const leagues = await League.find({ users: id });
        return res.render('start', { leagues });
    }
    else {
        res.render('start');
    }
}))

//Renders landingpage.
app.get('/', (req, res) => {
    res.render('landingpage');
})

//Throwes 404 error if page not found.
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found :(', 404))
})

//Creates error and renders an error page with error data.
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Something Went Wrong! :('
    res.status(statusCode).render('error', { err })
})

app.listen(3000, () => {
    console.log('serving on port 3000');
})