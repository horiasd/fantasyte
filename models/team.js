const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TeamSchema = new Schema({
    playerNames: [String],
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