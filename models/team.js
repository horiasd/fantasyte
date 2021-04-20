const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TeamSchema = new Schema({
    playerNames: [String],
    weeklyPoints: {
        type: Number,
        default: 0
    },
    points: {
        type: Number,
        default: 0
    },
    _belongsToUser: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    _belongsToLeague: {
        type: Schema.Types.ObjectId,
        ref: 'League'
    }
});

module.exports = mongoose.model('Team', TeamSchema);