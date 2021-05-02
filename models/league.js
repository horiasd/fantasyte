const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LeagueSchema = new Schema({
    leagueName: {
        type: String,
        required: true
    },
    leagueType: {
        type: String,
        required: true
    },
    draftTime: {
        type: Date,
        required: true
    },
    draftHappened: {
        type: Boolean,
        default: false
    },
    maxPlayerCount: {
        type: Number,
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    users: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    roundCount: {
        type: Number,
        default: 0
    },
    draftedPlayers: [String],
    seasonEnded: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('League', LeagueSchema);